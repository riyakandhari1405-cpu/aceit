import "server-only";
import OpenAI from "openai";
import type { Candidate } from "./model";
import { buildAnalysis, type AnalysisDraft } from "./analysis";
import { cleanCopy, evaluateSession, type Evaluation, type Turn } from "./evaluate";
import { insightSummary, type InsightPayload } from "./insights";
import { buildPortfolioContent } from "./portfolio-content";
import { buildQuestions, nextInterviewMove, type PreparedDraft } from "./questions";

const RULES = `You help a student prepare for interviews.
Never predict whether they will be hired, selected, shortlisted, or rejected.
Never invent projects, employers, skills, grades, or interview questions that are not in the input.
If a fact is missing, say it is missing.
Return only JSON.`;

export async function aiStatus() {
  const { source } = await getAiKey();
  return { enabled: source !== "off", source };
}

export async function getAiKey(): Promise<{ key: string | null; source: "environment" | "off" }> {
  const envKey = process.env.OPENAI_API_KEY?.trim();
  if (envKey) return { key: envKey, source: "environment" };
  return { key: null, source: "off" };
}

async function chatJson(system: string, user: string): Promise<{ json: Record<string, unknown> | null; warning?: string }> {
  const { key } = await getAiKey();
  if (!key) return { json: null };
  try {
    const client = new OpenAI({ apiKey: key });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = response.choices[0]?.message?.content;
    if (!text) return { json: null, warning: "OpenAI returned an empty response." };
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { json: null, warning: "OpenAI returned an unexpected shape." };
    }
    return { json: parsed as Record<string, unknown> };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const safe = message.includes(key) ? "request rejected" : message.slice(0, 160);
    return { json: null, warning: `OpenAI request failed (${safe}).` };
  }
}

export class AiError extends Error {}

function modelJson(ai: { json: Record<string, unknown> | null }) {
  return ai.json;
}

function asString(value: unknown) {
  return typeof value === "string" ? cleanCopy(value) : "";
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

export async function generatePortfolioCopy(candidate: Candidate, historicalSkills: string[]) {
  const built = buildPortfolioContent(candidate, historicalSkills);
  return { ...built, engine: "profile" as const, warning: undefined as string | undefined };
}

export async function generateAnalysis(candidate: Candidate, historicalSkills: string[]) {
  const local = { draft: buildAnalysis(candidate, historicalSkills), engine: "profile" as const, warning: undefined as string | undefined };
  const json = modelJson(
    await chatJson(
      `${RULES} Analyze this candidate for the target role. Use only the profile. Do not predict hiring. JSON: {"strengths":[""],"weakAreas":[""],"focusAreas":[""],"portfolioSummary":"","readinessSummary":""}`,
      JSON.stringify({ candidate: snapshot(candidate), historicalSkills }),
    ),
  );
  if (!json) return local;
  const draft: AnalysisDraft = {
    strengths: asStringList(json.strengths),
    weakAreas: asStringList(json.weakAreas),
    focusAreas: asStringList(json.focusAreas),
    portfolioSummary: asString(json.portfolioSummary),
    readinessSummary: asString(json.readinessSummary),
  };
  const blob = JSON.stringify(draft).toLowerCase();
  const lead = candidate.projects[0]?.name;
  if (!draft.strengths.length || !draft.focusAreas.length || !draft.readinessSummary || (lead && !blob.includes(lead.toLowerCase()))) {
    return local;
  }
  return { draft, engine: "openai" as const, warning: undefined as string | undefined };
}

export async function generateQuestionSet(input: {
  candidate: Candidate;
  interviewType: string;
  historical: { question: string; topic: string; roundType: string; company: string; role: string }[];
  historicalSkills: string[];
}) {
  const localQuestions = buildQuestions(input);
  const anchors = anchorList(input.candidate, input.historical);
  const json = modelJson(
    await chatJson(
      `${RULES} Write 8 interview questions for this person. Every question must include one of the anchor strings exactly. Draw from their projects, skills, experience, and the historical questions when one is relevant to the role. Do not ask generic puzzles or questions that could fit any candidate. Sources must be one of: Project, Skill, Experience, Internship, Role, Historical, Leadership, Hackathon, Achievement. JSON: {"questions":[{"text":"","source":"","rationale":""}]}`,
      JSON.stringify({
        anchors,
        profile: snapshot(input.candidate),
        interviewType: input.interviewType,
        target: input.candidate.target,
        historicalQuestions: input.historical,
        historicalSkills: input.historicalSkills,
      }),
    ),
  );
  const parsed = json ? parseQuestions(json.questions, anchors) : [];
  const projectNames = input.candidate.projects.map((project) => project.name.toLowerCase());
  const blob = parsed.map((item) => item.text).join(" ").toLowerCase();
  const keptProjects = projectNames.length === 0 || projectNames.some((name) => blob.includes(name));
  if (parsed.length < 4 || !keptProjects) {
    return { questions: localQuestions, engine: "profile" as const, warning: undefined as string | undefined };
  }
  return { questions: parsed.slice(0, 10), engine: "openai" as const, warning: undefined as string | undefined };
}

export async function generateInterviewerTurn(input: {
  candidate: Candidate;
  company: string;
  role: string;
  mode: string;
  asked: { text: string; source: string; answer?: string }[];
  prepared: { text: string; source: string }[];
  historicalQuestions: string[];
}) {
  const localMove = nextInterviewMove({ candidate: input.candidate, asked: input.asked, prepared: input.prepared });
  const local = localMove.done
    ? { done: true as const, engine: "profile" as const, warning: undefined as string | undefined }
    : { done: false as const, text: localMove.text, source: localMove.source, engine: "profile" as const, warning: undefined as string | undefined };
  if (input.asked.length >= 8) return { done: true as const, engine: "profile" as const, warning: undefined as string | undefined };
  const anchors = anchorList(input.candidate, input.historicalQuestions.map((question) => ({ question })));
  const json = modelJson(
    await chatJson(
      `${RULES} You are interviewing for ${input.role} at ${input.company}. Mode: ${input.mode}. Ask exactly one next question that reacts to the last answer when there is one. The question must include an anchor string. Set done to true only after at least 4 answers if the round has covered the profile. JSON: {"question":"","source":"","done":false}`,
      JSON.stringify({
        anchors,
        prepared: input.prepared,
        transcript: input.asked.map((item) => ({ question: item.text, source: item.source, answer: item.answer || "" })),
      }),
    ),
  );
  if (!json) return local;
  if (json.done === true && input.asked.filter((item) => item.answer).length >= 4) {
    return { done: true as const, engine: "openai" as const, warning: undefined as string | undefined };
  }
  const question = asString(json.question);
  const source = asString(json.source) || "Follow-up";
  if (!question || !mentionsAnchor(question, anchors)) return local;
  return { done: false as const, text: question, source, engine: "openai" as const, warning: undefined as string | undefined };
}

export async function generateEvaluation(input: {
  candidate: Candidate;
  company: string;
  role: string;
  turns: Turn[];
  signals: string[];
}) {
  const local = { report: evaluateSession(input), engine: "profile" as const, warning: undefined as string | undefined };
  const json = modelJson(
    await chatJson(
      `${RULES} Score this practice interview from the transcript and profile. technicalKnowledge, communication, problemSolving, confidence, and readinessScore are integers from 0 to 100. readinessScore is how complete the answers were, not a hiring decision. JSON: {"strengths":[""],"weaknesses":[""],"technicalKnowledge":0,"communication":0,"problemSolving":0,"confidence":0,"missingConcepts":[""],"suggestions":[""],"readinessScore":0,"narrative":""}`,
      JSON.stringify({
        company: input.company,
        role: input.role,
        signals: input.signals,
        transcript: input.turns,
        profile: snapshot(input.candidate),
      }),
    ),
  );
  if (!json) return local;
  const technicalDepth = bounded(json.technicalKnowledge ?? json.technicalDepth, 0, 100);
  const communication = bounded(json.communication, 0, 100);
  const problemSolving = bounded(json.problemSolving, 0, 100);
  const confidence = bounded(json.confidence, 0, 100);
  const readinessScore = bounded(json.readinessScore, 0, 100);
  if (technicalDepth === null || communication === null || problemSolving === null || confidence === null || readinessScore === null) {
    return local;
  }
  const scaled = [technicalDepth, communication, problemSolving, confidence].every((value) => value <= 10)
    ? [technicalDepth, communication, problemSolving, confidence].map((value) => value * 10)
    : [technicalDepth, communication, problemSolving, confidence];
  const report: Evaluation = {
    strengths: asStringList(json.strengths).slice(0, 4),
    weaknesses: asStringList(json.weaknesses).slice(0, 4),
    technicalDepth: scaled[0],
    communication: scaled[1],
    problemSolving: scaled[2],
    confidence: scaled[3],
    missingConcepts: asStringList(json.missingConcepts).slice(0, 5),
    suggestions: asStringList(json.suggestions).slice(0, 4),
    readinessScore: readinessScore <= 10 ? readinessScore * 10 : readinessScore,
    narrative: asString(json.narrative),
  };
  if (!report.strengths.length || !report.suggestions.length || !report.narrative) {
    return local;
  }
  return { report, engine: "openai" as const, warning: undefined as string | undefined };
}

export async function polishInsightSummary(company: string, role: string, payload: InsightPayload) {
  const built = insightSummary(company, role, payload);
  if (payload.recordCount + payload.questionCount + payload.experienceCount === 0) {
    return { summary: built, engine: "records" as const, warning: undefined as string | undefined };
  }
  const ai = await chatJson(
    `${RULES} Rewrite this placement-insight paragraph. Keep every count. Do not add companies, skills, or rounds that are not in the payload. Do not predict who will be hired. JSON: {"summary":""}`,
    JSON.stringify({ summary: built, payload }),
  );
  const summary = asString(ai.json?.summary);
  const countOk = summary.includes(String(payload.recordCount)) && summary.includes(String(payload.questionCount));
  if (!summary || !countOk || !summary.toLowerCase().includes(company.toLowerCase())) {
    return { summary: built, engine: "records" as const, warning: undefined as string | undefined };
  }
  return { summary, engine: "openai" as const, warning: undefined as string | undefined };
}

function bounded(value: unknown, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function snapshot(candidate: Candidate) {
  return {
    name: candidate.name,
    college: candidate.college,
    degree: candidate.degree,
    branch: candidate.branch,
    cgpa: candidate.cgpa,
    skills: candidate.skills.map((skill) => skill.name),
    projects: candidate.projects.map((project) => ({
      name: project.name,
      description: project.description,
      techStack: project.techStack,
      challenges: project.challenges,
      impact: project.impact,
    })),
    experiences: candidate.experiences.map((item) => `${item.title} at ${item.company}`),
    internships: candidate.internships.map((item) => `${item.title} at ${item.company}`),
    target: candidate.target,
  };
}

function anchorList(candidate: Candidate, historical: { question: string }[]) {
  return [
    candidate.name,
    candidate.target?.company || "",
    candidate.target?.role || "",
    ...candidate.projects.map((project) => project.name),
    ...candidate.skills.map((skill) => skill.name),
    ...candidate.experiences.flatMap((item) => [item.title, item.company]),
    ...candidate.internships.flatMap((item) => [item.title, item.company]),
    ...candidate.leadership.flatMap((item) => [item.role, item.organization]),
    ...candidate.hackathons.map((item) => item.name),
    ...historical.map((item) => item.question),
  ].filter((item) => item && item.trim().length > 1);
}

function mentionsAnchor(text: string, anchors: string[]) {
  const hay = text.toLowerCase();
  return anchors.some((anchor) => anchor.length > 2 && hay.includes(anchor.toLowerCase()));
}

function parseQuestions(value: unknown, anchors: string[]): PreparedDraft[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(["Project", "Skill", "Experience", "Internship", "Role", "Historical", "Leadership", "Hackathon", "Achievement", "Follow-up"]);
  const questions: PreparedDraft[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const text = asString(record.text);
    const source = asString(record.source);
    const rationale = asString(record.rationale);
    if (!text || !allowed.has(source) || !mentionsAnchor(`${text} ${rationale}`, anchors)) continue;
    questions.push({ text, source, rationale: rationale || "Rewritten from your profile and placement records." });
  }
  return questions;
}
