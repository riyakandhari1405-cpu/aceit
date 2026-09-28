"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { jsonValue } from "@/lib/json";
import { loadCandidate } from "@/lib/load-candidate";
import { preparationStamp } from "@/lib/model";
import { AiError, generateAnalysis, generateQuestionSet } from "@/lib/ai";
import { historicalContext } from "@/lib/placement";
import { revalidateApp } from "@/lib/revalidate";
import type { ActionResult } from "@/lib/action";

export async function runAnalysis(force = false): Promise<ActionResult<{ message: string; engine: string; warning?: string }>> {
  const viewer = await requireUser();
  const candidate = await loadCandidate(viewer.candidate.id);
  if (!candidate?.target) return { ok: false, error: "Set a target company and role before running analysis." };
  const stamp = preparationStamp(candidate.updatedAt, candidate.target);
  const prisma = await db();
  const existing = await prisma.profileAnalysis.findFirst({
    where: { userId: candidate.id, company: candidate.target.company, role: candidate.target.role, interviewType: candidate.target.interviewType },
    orderBy: { createdAt: "desc" },
  });
  if (existing && existing.stamp === stamp && !force) {
    return { ok: true, message: "This analysis already matches your profile and target.", engine: existing.engine };
  }
  const history = await historicalContext(candidate.target.company, candidate.target.role);
  let result;
  try {
    result = await generateAnalysis(candidate, history.skills);
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    throw error;
  }
  await prisma.profileAnalysis.create({
    data: {
      userId: candidate.id,
      company: candidate.target.company,
      role: candidate.target.role,
      interviewType: candidate.target.interviewType,
      strengths: jsonValue(result.draft.strengths),
      weakAreas: jsonValue(result.draft.weakAreas),
      focusAreas: jsonValue(result.draft.focusAreas),
      portfolioSummary: result.draft.portfolioSummary,
      readinessSummary: result.draft.readinessSummary,
      stamp,
      engine: result.engine,
    },
  });
  revalidateApp();
  return { ok: true, message: "Analysis saved.", engine: result.engine, warning: result.warning };
}

export async function runQuestions(input: { interviewType?: string; force?: boolean }): Promise<ActionResult<{ message: string; engine: string; warning?: string }>> {
  const viewer = await requireUser();
  const candidate = await loadCandidate(viewer.candidate.id);
  if (!candidate?.target) return { ok: false, error: "Choose a company and role, then generate questions." };
  const interviewType = input.interviewType || candidate.target.interviewType;
  const stamp = `${preparationStamp(candidate.updatedAt, { ...candidate.target, interviewType })}`;
  const prisma = await db();
  const existing = await prisma.preparedQuestion.findFirst({
    where: { userId: candidate.id, company: candidate.target.company, role: candidate.target.role, interviewType, stamp },
  });
  if (existing && !input.force) {
    return { ok: true, message: "This question set already matches your profile and target.", engine: existing.engine };
  }
  const history = await historicalContext(candidate.target.company, candidate.target.role);
  let result;
  try {
    result = await generateQuestionSet({
      candidate: { ...candidate, target: { ...candidate.target, interviewType } },
      interviewType,
      historical: history.questions,
      historicalSkills: history.skills,
    });
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    throw error;
  }
  await prisma.preparedQuestion.deleteMany({
    where: { userId: candidate.id, company: candidate.target.company, role: candidate.target.role, interviewType },
  });
  await prisma.preparedQuestion.createMany({
    data: result.questions.map((question) => ({
      userId: candidate.id,
      company: candidate.target!.company,
      role: candidate.target!.role,
      interviewType,
      text: question.text,
      source: question.source,
      rationale: question.rationale,
      stamp,
      engine: result.engine,
    })),
  });
  revalidateApp();
  return {
    ok: true,
    message: `${result.questions.length} questions saved for ${candidate.target.role} at ${candidate.target.company}.`,
    engine: result.engine,
    warning: result.warning,
  };
}
