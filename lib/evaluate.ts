import type { Candidate } from "./model";
import { clip } from "./model";
import { includesTerm } from "./scoring";
import { unique as uniqueKeep } from "./model";

export type Turn = { question: string; source: string; answer: string };

export type Evaluation = {
  strengths: string[];
  weaknesses: string[];
  technicalDepth: number;
  communication: number;
  problemSolving: number;
  confidence: number;
  missingConcepts: string[];
  suggestions: string[];
  readinessScore: number;
  narrative: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function evaluateSession(input: {
  candidate: Candidate;
  company: string;
  role: string;
  turns: Turn[];
  signals: string[];
}): Evaluation {
  const answers = input.turns.map((turn) => turn.answer.trim()).filter(Boolean);
  const joined = answers.join("\n").toLowerCase();
  const words = joined.split(/\s+/).filter(Boolean);
  const average = answers.length ? words.length / answers.length : 0;
  const orderedSignals = uniqueKeep(input.signals);
  const mentioned = orderedSignals.filter((signal) => includesTerm(joined, signal));
  const missing = orderedSignals.filter((signal) => !includesTerm(joined, signal)).slice(0, 4);
  const namedProjects = input.candidate.projects.filter((project) => joined.includes(project.name.toLowerCase()));
  const thin = input.turns.filter((turn) => turn.answer.trim().split(/\s+/).filter(Boolean).length < 12);

  let technical = 22 + mentioned.length * 12 + namedProjects.length * 10;
  if (average > 30) technical += 8;
  const technicalDepth = clamp(technical, 0, 100);

  let communication = 20;
  if (average >= 12) communication = 42;
  if (average >= 25) communication = 64;
  if (average >= 45) communication = 78;
  if (average >= 70) communication = 88;
  if (/\b(because|so that|for example|instead)\b/i.test(joined)) communication += 8;
  if (thin.length) communication -= 12 * Math.min(thin.length, 2);
  const communicationScore = clamp(communication, 0, 100);

  let problem = 18;
  if (/\b(because|tried|failed|trade-?off|instead|decided|approach|broke|measured|first)\b/i.test(joined)) problem += 28;
  if (namedProjects.length) problem += 14;
  if (mentioned.length >= 2) problem += 12;
  if (average >= 30) problem += 10;
  if (thin.length) problem -= 10;
  const problemSolving = clamp(problem, 0, 100);

  let confidence = 20;
  if (/\b(i built|i chose|i measured|i shipped|i decided|i used|i kept)\b/i.test(joined)) confidence += 24;
  if (/\d/.test(joined)) confidence += 10;
  if (namedProjects.length) confidence += 16;
  if (average >= 20) confidence += 12;
  if (thin.length) confidence -= 16;
  const confidenceScore = clamp(confidence, 0, 100);

  const readinessScore = clamp(technicalDepth * 0.35 + communicationScore * 0.2 + problemSolving * 0.25 + confidenceScore * 0.2, 0, 100);

  const strengths: string[] = [];
  if (namedProjects.length) {
    strengths.push(
      `You talked about ${namedProjects.map((project) => project.name).join(" and ")}, so the round stayed attached to work you actually did.`,
    );
  }
  if (mentioned.length) {
    strengths.push(
      `The answers used ${mentioned.slice(0, 4).join(", ")}, which are part of the preparation set for ${input.role}.`,
    );
  }
  if (communicationScore >= 70) {
    strengths.push("The longer answers gave a reason, which is something an interviewer can follow up on.");
  }
  if (!strengths.length) {
    strengths.push("You completed the round. The next one needs names, tools, and a result from your own work.");
  }

  const weaknesses: string[] = [];
  for (const turn of thin.slice(0, 2)) {
    weaknesses.push(`The reply to “${clip(turn.question, 90)}” is too short to show how you think.`);
  }
  if (missing.length) {
    weaknesses.push(
      `${missing.join(", ")} did not come up. Those terms are in the preparation set for ${input.role} at ${input.company}.`,
    );
  }
  if (!weaknesses.length) {
    weaknesses.push("This round was not thin. The next gain is one tradeoff you have not explained yet.");
  }

  const suggestions: string[] = [];
  const quietProject = input.candidate.projects.find((project) => !joined.includes(project.name.toLowerCase()));
  if (quietProject) {
    suggestions.push(
      `Bring ${quietProject.name} into the next answer. Be ready to explain ${
        quietProject.challenges ? clip(quietProject.challenges, 120).replace(/[.!?]+$/, "") : "the hardest technical choice"
      }.`,
    );
  }
  for (const concept of missing.slice(0, 2)) {
    const hook = namedProjects[0]?.name || quietProject?.name || "a project you shipped";
    suggestions.push(`Prepare a 60-second explanation of ${concept} using ${hook}, including what fails if you ignore it.`);
  }
  if (thin.length) {
    suggestions.push("Use a short structure: situation, what you tried, what you kept, and how you knew it worked.");
  }
  if (!suggestions.length) {
    suggestions.push(`Run another ${input.role} round and put one measured result into the answer.`);
  }

  const narrative = `${input.role} readiness is ${readinessScore} out of 100 for ${input.company}. The score comes from ${answers.length} answer${
    answers.length === 1 ? "" : "s"
  } and how completely they used the profile.`;

  return {
    strengths,
    weaknesses,
    technicalDepth,
    communication: communicationScore,
    problemSolving,
    confidence: confidenceScore,
    missingConcepts: missing,
    suggestions,
    readinessScore,
    narrative,
  };
}

export function cleanCopy(text: string) {
  const banned =
    /will be (selected|hired)|will not be (selected|hired)|selection probability|chance of (an )?offer|likely to (get|receive) (the )?(job|offer|role)|predict(s|ed)? (selection|hiring)/i;
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !banned.test(sentence))
    .join(" ")
    .trim();
}

export function clampNear(value: unknown, base: number, span: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return base;
  const bounded = clamp(numeric, min, max);
  return clamp(Math.min(base + span, Math.max(base - span, bounded)), min, max);
}
