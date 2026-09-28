"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { jsonValue } from "@/lib/json";
import { loadCandidate } from "@/lib/load-candidate";
import { isInterviewType, preparationStamp, unique } from "@/lib/model";
import { AiError, generateEvaluation, generateInterviewerTurn, generateQuestionSet } from "@/lib/ai";
import { historicalContext } from "@/lib/placement";
import { buildSignalSet } from "@/lib/scoring";
import { revalidateApp } from "@/lib/revalidate";
import type { ActionResult } from "@/lib/action";

export async function startInterview(input: { mode: string; questionId?: string }): Promise<ActionResult<{ id: string }>> {
  const viewer = await requireUser();
  const candidate = await loadCandidate(viewer.candidate.id);
  if (!candidate?.target) return { ok: false, error: "Choose a company and role, then start the interview." };
  if (!isInterviewType(input.mode)) return { ok: false, error: "Pick an interview mode." };

  const prisma = await db();
  const stamp = preparationStamp(candidate.updatedAt, { ...candidate.target, interviewType: input.mode });
  let bank = await prisma.preparedQuestion.findMany({
    where: { userId: candidate.id, company: candidate.target.company, role: candidate.target.role, interviewType: input.mode, stamp },
    orderBy: { createdAt: "asc" },
  });
  let engine = bank[0]?.engine || "openai";
  if (!bank.length) {
    const history = await historicalContext(candidate.target.company, candidate.target.role);
    let generated;
    try {
      generated = await generateQuestionSet({
        candidate: { ...candidate, target: { ...candidate.target, interviewType: input.mode } },
        interviewType: input.mode,
        historical: history.questions,
        historicalSkills: history.skills,
      });
    } catch (error) {
      if (error instanceof AiError) return { ok: false, error: error.message };
      throw error;
    }
    await prisma.preparedQuestion.deleteMany({
      where: { userId: candidate.id, company: candidate.target.company, role: candidate.target.role, interviewType: input.mode },
    });
    await prisma.preparedQuestion.createMany({
      data: generated.questions.map((question) => ({
        userId: candidate.id,
        company: candidate.target!.company,
        role: candidate.target!.role,
        interviewType: input.mode,
        text: question.text,
        source: question.source,
        rationale: question.rationale,
        stamp,
        engine: generated.engine,
      })),
    });
    bank = await prisma.preparedQuestion.findMany({
      where: { userId: candidate.id, company: candidate.target.company, role: candidate.target.role, interviewType: input.mode, stamp },
      orderBy: { createdAt: "asc" },
    });
    engine = generated.engine;
  }
  if (!bank.length) return { ok: false, error: "No questions could be built from this profile." };
  const chosen = input.questionId ? bank.find((item) => item.id === input.questionId) ?? (await prisma.preparedQuestion.findFirst({ where: { id: input.questionId, userId: candidate.id } })) : bank[0];
  const first = chosen ?? bank[0];
  const session = await prisma.interviewSession.create({
    data: {
      userId: candidate.id,
      mode: input.mode,
      company: candidate.target.company,
      role: candidate.target.role,
      status: "active",
      engine,
      questions: { create: { order: 1, text: first.text, source: first.source } },
    },
  });
  revalidateApp();
  return { ok: true, id: session.id };
}

export async function submitAnswer(sessionId: string, text: string): Promise<ActionResult<{ warning?: string }>> {
  const answer = text.trim();
  if (!answer) return { ok: false, error: "Write an answer before sending." };
  if (answer.length > 5000) return { ok: false, error: "Keep the answer under 5000 characters." };
  const viewer = await requireUser();
  const prisma = await db();
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: viewer.candidate.id },
    include: { questions: { orderBy: { order: "asc" }, include: { answer: true } } },
  });
  if (!session || session.status === "completed") return { ok: false, error: "This interview is already scored." };
  const open = session.questions.find((question) => !question.answer);
  if (!open) return { ok: false, error: "This round is ready to score." };

  const candidate = await loadCandidate(viewer.candidate.id);
  if (!candidate) return { ok: false, error: "Profile not found." };
  const history = await historicalContext(session.company, session.role);
  const bank = await prisma.preparedQuestion.findMany({
    where: { userId: candidate.id, company: session.company, role: session.role, interviewType: session.mode },
    orderBy: { createdAt: "asc" },
  });
  const asked = session.questions.map((question) => ({
    text: question.text,
    source: question.source,
    answer: question.id === open.id ? answer : question.answer?.text,
  }));
  let turn;
  try {
    turn = await generateInterviewerTurn({
      candidate,
      company: session.company,
      role: session.role,
      mode: session.mode,
      asked,
      prepared: bank.map((item) => ({ text: item.text, source: item.source })),
      historicalQuestions: history.questions.map((item) => item.question),
    });
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    throw error;
  }
  await prisma.interviewAnswer.create({ data: { questionId: open.id, text: answer } });
  if (turn.done) {
    await prisma.interviewSession.update({ where: { id: session.id }, data: { status: "ready", engine: turn.engine } });
  } else {
    await prisma.interviewQuestion.create({
      data: { sessionId: session.id, order: session.questions.length + 1, text: turn.text, source: turn.source },
    });
    await prisma.interviewSession.update({ where: { id: session.id }, data: { status: "active", engine: turn.engine } });
  }
  revalidateApp();
  return { ok: true, warning: turn.warning };
}

export async function finishInterview(sessionId: string): Promise<ActionResult<{ warning?: string }>> {
  const viewer = await requireUser();
  const prisma = await db();
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: viewer.candidate.id },
    include: { questions: { orderBy: { order: "asc" }, include: { answer: true } }, report: true },
  });
  if (!session) return { ok: false, error: "Interview not found." };
  if (session.report) return { ok: true };
  const turns = session.questions
    .filter((question) => question.answer?.text)
    .map((question) => ({ question: question.text, source: question.source, answer: question.answer!.text }));
  if (!turns.length) return { ok: false, error: "Answer at least one question before scoring." };
  const candidate = await loadCandidate(viewer.candidate.id);
  if (!candidate) return { ok: false, error: "Profile not found." };
  const history = await historicalContext(session.company, session.role);
  const signalSet = buildSignalSet(session.role, history.skills);
  const signals = unique([...signalSet.historical, ...signalSet.role, ...candidate.skills.map((skill) => skill.name)]);
  let result;
  try {
    result = await generateEvaluation({
      candidate,
      company: session.company,
      role: session.role,
      turns,
      signals,
    });
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    throw error;
  }
  await prisma.feedbackReport.create({
    data: {
      userId: candidate.id,
      sessionId: session.id,
      strengths: jsonValue(result.report.strengths),
      weaknesses: jsonValue(result.report.weaknesses),
      technicalDepth: result.report.technicalDepth,
      communication: result.report.communication,
      problemSolving: result.report.problemSolving,
      confidence: result.report.confidence,
      missingConcepts: jsonValue(result.report.missingConcepts),
      suggestions: jsonValue(result.report.suggestions),
      readinessScore: result.report.readinessScore,
      narrative: result.report.narrative,
      engine: result.engine,
    },
  });
  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { status: "completed", endedAt: new Date(), engine: result.engine },
  });
  revalidateApp();
  return { ok: true, warning: result.warning };
}

export async function deleteInterview(sessionId: string) {
  const viewer = await requireUser();
  const prisma = await db();
  const session = await prisma.interviewSession.findFirst({ where: { id: sessionId, userId: viewer.candidate.id } });
  if (!session) return;
  await prisma.interviewSession.delete({ where: { id: session.id } });
  revalidateApp();
  redirect("/interview");
}
