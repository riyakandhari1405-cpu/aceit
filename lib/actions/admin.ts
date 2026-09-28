"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { parseCsv, withoutHeader } from "@/lib/csv";
import { revalidateApp } from "@/lib/revalidate";
import type { ActionResult } from "@/lib/action";

function issue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export async function savePlacementRecord(input: Record<string, string | undefined>): Promise<ActionResult> {
  const parsed = z
    .object({
      id: z.string().optional(),
      company: z.string().trim().min(1, "Add a company.").max(120),
      role: z.string().trim().min(1, "Add a role.").max(120),
      year: z.string().trim().max(4),
      college: z.string().trim().max(160),
      selectedSkills: z.string().trim().max(400),
      notes: z.string().trim().max(2000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const yearText = parsed.data.year.trim();
  let year: number | null = null;
  if (yearText) {
    year = Number(yearText);
    if (!Number.isInteger(year) || year < 1990 || year > 2040) return { ok: false, error: "Year should be between 1990 and 2040." };
  }
  const admin = await requireAdmin();
  const prisma = await db();
  const data = {
    company: parsed.data.company,
    role: parsed.data.role,
    year,
    college: parsed.data.college,
    selectedSkills: parsed.data.selectedSkills,
    notes: parsed.data.notes,
    uploadedById: admin.candidate.id,
  };
  if (parsed.data.id) {
    const existing = await prisma.placementRecord.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return { ok: false, error: "Record not found." };
    await prisma.placementRecord.update({ where: { id: existing.id }, data });
  } else {
    await prisma.placementRecord.create({ data });
  }
  revalidateApp();
  return { ok: true };
}

export async function deletePlacementRecord(id: string): Promise<ActionResult> {
  await requireAdmin();
  const prisma = await db();
  await prisma.placementRecord.delete({ where: { id } }).catch(() => null);
  revalidateApp();
  return { ok: true };
}

export async function savePlacementQuestion(input: Record<string, string | undefined>): Promise<ActionResult> {
  const parsed = z
    .object({
      id: z.string().optional(),
      company: z.string().trim().min(1, "Add a company.").max(120),
      role: z.string().trim().min(1, "Add a role.").max(120),
      roundType: z.string().trim().min(1, "Add a round.").max(80),
      question: z.string().trim().min(8, "Write the question.").max(1000),
      topic: z.string().trim().min(1, "Add a topic.").max(80),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const admin = await requireAdmin();
  const prisma = await db();
  const data = { ...parsed.data, uploadedById: admin.candidate.id };
  const { id, ...fields } = data;
  if (id) {
    const existing = await prisma.placementQuestion.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Question not found." };
    await prisma.placementQuestion.update({ where: { id }, data: fields });
  } else await prisma.placementQuestion.create({ data: fields });
  revalidateApp();
  return { ok: true };
}

export async function deletePlacementQuestion(id: string): Promise<ActionResult> {
  await requireAdmin();
  const prisma = await db();
  await prisma.placementQuestion.delete({ where: { id } }).catch(() => null);
  revalidateApp();
  return { ok: true };
}

export async function savePlacementExperience(input: Record<string, string | undefined>): Promise<ActionResult> {
  const parsed = z
    .object({
      id: z.string().optional(),
      company: z.string().trim().min(1, "Add a company.").max(120),
      role: z.string().trim().min(1, "Add a role.").max(120),
      roundType: z.string().trim().max(80),
      experience: z.string().trim().min(12, "Write the interview note.").max(3000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const admin = await requireAdmin();
  const prisma = await db();
  const { id, ...fields } = { ...parsed.data, uploadedById: admin.candidate.id };
  if (id) {
    const existing = await prisma.placementExperience.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Note not found." };
    await prisma.placementExperience.update({ where: { id }, data: fields });
  } else await prisma.placementExperience.create({ data: fields });
  revalidateApp();
  return { ok: true };
}

export async function deletePlacementExperience(id: string): Promise<ActionResult> {
  await requireAdmin();
  const prisma = await db();
  await prisma.placementExperience.delete({ where: { id } }).catch(() => null);
  revalidateApp();
  return { ok: true };
}

export async function importPlacementCsv(kind: "records" | "questions" | "experiences", csv: string): Promise<ActionResult<{ count: number; skipped: number }>> {
  if (csv.length > 200000) return { ok: false, error: "That file is too large." };
  const admin = await requireAdmin();
  const prisma = await db();
  const rows = withoutHeader(parseCsv(csv), "company");
  let count = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      if (kind === "records") {
        const [company, role, year, college, selectedSkills, notes] = row;
        if (!company || !role) {
          skipped += 1;
          continue;
        }
        const parsedYear = year ? Number(year) : null;
        await prisma.placementRecord.create({
          data: {
            company,
            role,
            year: parsedYear && Number.isInteger(parsedYear) ? parsedYear : null,
            college: college || "",
            selectedSkills: selectedSkills || "",
            notes: notes || "",
            uploadedById: admin.candidate.id,
          },
        });
      } else if (kind === "questions") {
        const [company, role, roundType, question, topic] = row;
        if (!company || !role || !question || !topic || !roundType) {
          skipped += 1;
          continue;
        }
        await prisma.placementQuestion.create({
          data: { company, role, roundType, question, topic, uploadedById: admin.candidate.id },
        });
      } else {
        const [company, role, roundType, experience] = row;
        if (!company || !role || !experience) {
          skipped += 1;
          continue;
        }
        await prisma.placementExperience.create({
          data: { company, role, roundType: roundType || "", experience, uploadedById: admin.candidate.id },
        });
      }
      count += 1;
    } catch {
      skipped += 1;
    }
  }
  if (!count) return { ok: false, error: "No rows were imported. Check the column order." };
  revalidateApp();
  return { ok: true, count, skipped };
}

export async function saveOpenAiKey(key: string): Promise<ActionResult> {
  await requireAdmin();
  const trimmed = key.trim();
  const prisma = await db();
  if (!trimmed) {
    await prisma.setting.deleteMany({ where: { key: "openai_api_key" } });
    return { ok: true };
  }
  if (!trimmed.startsWith("sk-") || trimmed.length < 20) {
    return { ok: false, error: "Paste a full OpenAI API key." };
  }
  await prisma.setting.upsert({
    where: { key: "openai_api_key" },
    update: { value: trimmed },
    create: { key: "openai_api_key", value: trimmed },
  });
  return { ok: true };
}
