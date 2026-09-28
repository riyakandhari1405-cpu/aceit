"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { isInterviewType } from "@/lib/model";
import { canonical, placementOptions } from "@/lib/placement";
import { revalidateApp, touchUser } from "@/lib/revalidate";
async function writeGoal(userId: string, company: string, role: string, interviewType: string) {
  const prisma = await db();
  await prisma.targetApplication.updateMany({ where: { userId }, data: { isActive: false } });
  await prisma.targetApplication.create({
    data: { userId, company, role, interviewType, isActive: true },
  });
  await touchUser(userId);
  revalidateApp();
}

export async function saveTarget(_prev: { error: string; saved: boolean } | null, formData: FormData) {
  const viewer = await requireUser();
  const options = await placementOptions();
  const company = canonical(String(formData.get("company") || ""), options.companies);
  const role = canonical(String(formData.get("role") || ""), options.roles);
  const interviewType = String(formData.get("interviewType") || "Technical");
  if (!company || !role) return { error: "Add both a company and a role.", saved: false };
  if (!isInterviewType(interviewType)) return { error: "Pick an interview type.", saved: false };
  await writeGoal(viewer.candidate.id, company, role, interviewType);
  return { error: "", saved: true };
}

export async function setGoal(formData: FormData) {
  const viewer = await requireUser();
  const options = await placementOptions();
  const company = canonical(String(formData.get("company") || ""), options.companies);
  const role = canonical(String(formData.get("role") || ""), options.roles);
  const interviewType = String(formData.get("interviewType") || "Technical");
  if (!company || !role || role === "*" || !isInterviewType(interviewType)) redirect("/insights");
  await writeGoal(viewer.candidate.id, company, role, interviewType);
  redirect("/prepare");
}

export async function activateTarget(formData: FormData) {
  const viewer = await requireUser();
  const id = String(formData.get("id") || "");
  const prisma = await db();
  const target = await prisma.targetApplication.findFirst({ where: { id, userId: viewer.candidate.id } });
  if (!target) return;
  await prisma.targetApplication.updateMany({ where: { userId: viewer.candidate.id }, data: { isActive: false } });
  await prisma.targetApplication.update({ where: { id }, data: { isActive: true } });
  await touchUser(viewer.candidate.id);
  revalidateApp();
}

export async function deleteTarget(formData: FormData) {
  const viewer = await requireUser();
  const id = String(formData.get("id") || "");
  const prisma = await db();
  const target = await prisma.targetApplication.findFirst({ where: { id, userId: viewer.candidate.id } });
  if (!target) return;
  await prisma.targetApplication.delete({ where: { id } });
  await touchUser(viewer.candidate.id);
  revalidateApp();
}
