import "server-only";
import { db } from "./db";
import { aggregateInsights, emptyInsight, insightStamp, insightSummary, type InsightPayload } from "./insights";
import { polishInsightSummary } from "./ai";
import { jsonValue } from "./json";
import { unique } from "./model";

export async function placementOptions() {
  const prisma = await db();
  const [records, questions, experiences] = await Promise.all([
    prisma.placementRecord.findMany({ select: { company: true, role: true } }),
    prisma.placementQuestion.findMany({ select: { company: true, role: true } }),
    prisma.placementExperience.findMany({ select: { company: true, role: true } }),
  ]);
  const rows = [...records, ...questions, ...experiences];
  return {
    companies: unique(rows.map((row) => row.company)).sort((a, b) => a.localeCompare(b)),
    roles: unique(rows.map((row) => row.role)).sort((a, b) => a.localeCompare(b)),
  };
}

export function canonical(input: string, options: string[]) {
  const found = options.find((option) => option.toLowerCase() === input.trim().toLowerCase());
  return found ?? input.trim();
}

export async function loadCorpus(company: string, role: string) {
  const prisma = await db();
  const companyFilter = { equals: company, mode: "insensitive" as const };
  const where = role === "*" ? { company: companyFilter } : { company: companyFilter, role: { equals: role, mode: "insensitive" as const } };
  const [records, questions, experiences] = await Promise.all([
    prisma.placementRecord.findMany({ where, orderBy: [{ year: "desc" }, { createdAt: "asc" }] }),
    prisma.placementQuestion.findMany({ where, orderBy: { createdAt: "asc" } }),
    prisma.placementExperience.findMany({ where, orderBy: { createdAt: "asc" } }),
  ]);
  return { records, questions, experiences };
}

export async function historicalContext(company: string, role: string) {
  const corpus = await loadCorpus(company, role);
  const skills = corpus.records.flatMap((record) => record.selectedSkills.split(/[,|/]/).map((item) => item.trim()).filter(Boolean));
  return {
    skills,
    questions: corpus.questions.map((question) => ({
      question: question.question,
      topic: question.topic,
      roundType: question.roundType,
      company: question.company,
      role: question.role,
    })),
  };
}

export async function getInsight(company: string, role: string): Promise<{
  payload: InsightPayload;
  summary: string;
  engine: string;
  warning?: string;
}> {
  const corpus = await loadCorpus(company, role);
  const payload = aggregateInsights({
    records: corpus.records.map((record) => ({ selectedSkills: record.selectedSkills })),
    questions: corpus.questions.map((question) => ({
      question: question.question,
      topic: question.topic,
      roundType: question.roundType,
    })),
    experiences: corpus.experiences.map((item) => ({ roundType: item.roundType, experience: item.experience })),
  });
  const stamp = insightStamp(company, role, {
    records: corpus.records.length,
    questions: corpus.questions.length,
    experiences: corpus.experiences.length,
  });
  const prisma = await db();
  const existing = await prisma.companyInsight.findUnique({ where: { company_role: { company, role } } });
  if (existing && existing.stamp === stamp) {
    const cached = existing.payload as InsightPayload;
    if (cached && Array.isArray(cached.skills)) {
      return { payload: cached, summary: existing.summary, engine: existing.engine };
    }
  }
  const polished = await polishInsightSummary(company, role, payload.recordCount + payload.questionCount ? payload : emptyInsight());
  const summary = polished.summary || insightSummary(company, role, payload);
  await prisma.companyInsight.upsert({
    where: { company_role: { company, role } },
    update: { stamp, payload: jsonValue(payload), summary, engine: polished.engine },
    create: { company, role, stamp, payload: jsonValue(payload), summary, engine: polished.engine },
  });
  return { payload, summary, engine: polished.engine, warning: polished.warning };
}
