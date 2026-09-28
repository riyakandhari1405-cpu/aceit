"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { loadCandidate } from "@/lib/load-candidate";
import { profileContentStamp } from "@/lib/model";
import { writePortfolio } from "@/lib/portfolio-sync";
import { revalidateApp } from "@/lib/revalidate";
import type { ActionResult } from "@/lib/action";

export async function generatePortfolio(force = false): Promise<ActionResult<{ message: string; engine: string; warning?: string }>> {
  const viewer = await requireUser();
  const candidate = await loadCandidate(viewer.candidate.id);
  if (!candidate?.target) return { ok: false, error: "Choose a company and role, then generate the portfolio." };
  const prisma = await db();
  const existing = await prisma.portfolio.findFirst({ where: { userId: candidate.id }, orderBy: { updatedAt: "desc" } });
  const stamp = profileContentStamp(candidate);
  if (existing && existing.stamp === stamp && !force) {
    return { ok: true, message: "This portfolio already matches your profile and target.", engine: existing.engine };
  }
  let saved;
  try {
    saved = await writePortfolio(candidate, existing);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The portfolio could not be refreshed.";
    return { ok: false, error: message };
  }
  revalidateApp();
  revalidatePath(`/p/${saved.saved.slug}`);
  return {
    ok: true,
    message: force ? "Portfolio regenerated for the current target." : "Portfolio generated for the current target.",
    engine: saved.engine,
    warning: saved.warning,
  };
}

export async function savePortfolioTheme(theme: string): Promise<ActionResult> {
  if (!["signal", "editorial", "ink"].includes(theme)) return { ok: false, error: "Unknown theme." };
  const viewer = await requireUser();
  const prisma = await db();
  const portfolio = await prisma.portfolio.findFirst({ where: { userId: viewer.candidate.id } });
  if (!portfolio) return { ok: false, error: "Generate a portfolio first." };
  await prisma.portfolio.update({ where: { id: portfolio.id }, data: { theme } });
  revalidateApp();
  revalidatePath(`/p/${portfolio.slug}`);
  return { ok: true };
}

export async function setPortfolioPublic(isPublic: boolean): Promise<ActionResult> {
  const viewer = await requireUser();
  const prisma = await db();
  const portfolio = await prisma.portfolio.findFirst({ where: { userId: viewer.candidate.id } });
  if (!portfolio) return { ok: false, error: "Generate a portfolio first." };
  await prisma.portfolio.update({ where: { id: portfolio.id }, data: { isPublic } });
  revalidateApp();
  revalidatePath(`/p/${portfolio.slug}`);
  return { ok: true };
}

