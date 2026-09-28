"use server";

import { z } from "zod";
import type { SkillCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { normalizeUrl } from "@/lib/model";
import { revalidateApp, touchUser } from "@/lib/revalidate";
import type { ActionResult } from "@/lib/action";

function issue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

async function viewerId() {
  const viewer = await requireUser();
  return viewer.candidate.id;
}

export async function savePersonal(input: {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  headline: string;
}): Promise<ActionResult> {
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Add your name.").max(80),
      email: z.string().trim().email("Enter a valid email.").max(120),
      phone: z.string().trim().max(40),
      location: z.string().trim().max(80),
      linkedin: z.string().trim().max(200),
      github: z.string().trim().max(200),
      headline: z.string().trim().max(140),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const userId = await viewerId();
  const prisma = await db();
  const email = parsed.data.email.toLowerCase();
  const taken = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
  if (taken) return { ok: false, error: "Another account already uses that email." };
  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data.name, email } });
  await prisma.profile.upsert({
    where: { userId },
    update: {
      phone: parsed.data.phone,
      location: parsed.data.location,
      linkedin: normalizeUrl(parsed.data.linkedin),
      github: normalizeUrl(parsed.data.github),
      headline: parsed.data.headline,
    },
    create: {
      userId,
      phone: parsed.data.phone,
      location: parsed.data.location,
      linkedin: normalizeUrl(parsed.data.linkedin),
      github: normalizeUrl(parsed.data.github),
      headline: parsed.data.headline,
    },
  });
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

export async function saveEducation(input: {
  tenthPercent: string;
  twelfthPercent: string;
  college: string;
  degree: string;
  branch: string;
  cgpa: string;
  graduationYear: string;
}): Promise<ActionResult> {
  const tenth = parseNumber(input.tenthPercent, 0, 100, "10th percentage");
  if (!tenth.ok) return tenth;
  const twelfth = parseNumber(input.twelfthPercent, 0, 100, "12th percentage");
  if (!twelfth.ok) return twelfth;
  const cgpa = parseNumber(input.cgpa, 0, 10, "CGPA");
  if (!cgpa.ok) return cgpa;
  const year = parseNumber(input.graduationYear, 1990, 2040, "Graduation year");
  if (!year.ok) return year;
  const college = input.college.trim();
  if (college.length > 120) return { ok: false, error: "College name is too long." };
  const userId = await viewerId();
  const prisma = await db();
  const data = {
    tenthPercent: tenth.value,
    twelfthPercent: twelfth.value,
    college,
    degree: input.degree.trim().slice(0, 80),
    branch: input.branch.trim().slice(0, 80),
    cgpa: cgpa.value,
    graduationYear: year.value === null ? null : Math.round(year.value),
  };
  await prisma.education.upsert({ where: { userId }, update: data, create: { userId, ...data } });
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

export async function saveSkill(input: { id?: string; name: string; category: string }): Promise<ActionResult> {
  const parsed = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1, "Name the skill.").max(60),
      category: z.enum(["TECHNICAL", "TOOL", "FRAMEWORK", "SOFT"]),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const userId = await viewerId();
  const prisma = await db();
  const duplicate = await prisma.skill.findFirst({
    where: {
      userId,
      name: { equals: parsed.data.name, mode: "insensitive" },
      NOT: parsed.data.id ? { id: parsed.data.id } : undefined,
    },
  });
  if (duplicate) return { ok: false, error: "That skill is already on your profile." };
  if (parsed.data.id) {
    const owned = await prisma.skill.findFirst({ where: { id: parsed.data.id, userId } });
    if (!owned) return { ok: false, error: "Skill not found." };
    await prisma.skill.update({
      where: { id: owned.id },
      data: { name: parsed.data.name, category: parsed.data.category as SkillCategory },
    });
  } else {
    await prisma.skill.create({
      data: { userId, name: parsed.data.name, category: parsed.data.category as SkillCategory },
    });
  }
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  return removeOwned("skill", id);
}

export async function saveProject(input: Record<string, string | undefined>): Promise<ActionResult> {
  const parsed = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1, "Name the project.").max(120),
      description: z.string().trim().max(2000),
      techStack: z.string().trim().max(300),
      challenges: z.string().trim().max(2000),
      solution: z.string().trim().max(2000),
      impact: z.string().trim().max(1000),
      github: z.string().trim().max(300),
      demoLink: z.string().trim().max(300),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const userId = await viewerId();
  const prisma = await db();
  const data = {
    ...parsed.data,
    github: normalizeUrl(parsed.data.github),
    demoLink: normalizeUrl(parsed.data.demoLink),
  };
  const { id, ...fields } = data;
  if (id) {
    const owned = await prisma.project.findFirst({ where: { id, userId } });
    if (!owned) return { ok: false, error: "Project not found." };
    await prisma.project.update({ where: { id }, data: fields });
  } else {
    await prisma.project.create({ data: { userId, ...fields } });
  }
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  return removeOwned("project", id);
}

export async function saveCertification(input: Record<string, string | undefined>): Promise<ActionResult> {
  const parsed = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1, "Name the certification.").max(140),
      issuer: z.string().trim().max(120),
      issuedOn: z.string().trim().max(40),
      credentialUrl: z.string().trim().max(300),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const userId = await viewerId();
  const prisma = await db();
  const data = { ...parsed.data, credentialUrl: normalizeUrl(parsed.data.credentialUrl) };
  const { id, ...fields } = data;
  if (id) {
    const owned = await prisma.certification.findFirst({ where: { id, userId } });
    if (!owned) return { ok: false, error: "Certification not found." };
    await prisma.certification.update({ where: { id }, data: fields });
  } else await prisma.certification.create({ data: { userId, ...fields } });
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

export async function deleteCertification(id: string): Promise<ActionResult> {
  return removeOwned("certification", id);
}

const roleSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Add a title.").max(120),
  company: z.string().trim().max(120),
  startDate: z.string().trim().max(40),
  endDate: z.string().trim().max(40),
  description: z.string().trim().max(2000),
});

export async function saveExperience(input: Record<string, string | undefined>): Promise<ActionResult> {
  return saveRole("experience", input);
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  return removeOwned("experience", id);
}

export async function saveInternship(input: Record<string, string | undefined>): Promise<ActionResult> {
  return saveRole("internship", input);
}

export async function deleteInternship(id: string): Promise<ActionResult> {
  return removeOwned("internship", id);
}

export async function saveAchievement(input: Record<string, string | undefined>): Promise<ActionResult> {
  const parsed = z
    .object({
      id: z.string().optional(),
      title: z.string().trim().min(1, "Name the achievement.").max(140),
      description: z.string().trim().max(1000),
      year: z.string().trim().max(40),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const userId = await viewerId();
  const prisma = await db();
  const { id, ...fields } = parsed.data;
  if (id) {
    const owned = await prisma.achievement.findFirst({ where: { id, userId } });
    if (!owned) return { ok: false, error: "Achievement not found." };
    await prisma.achievement.update({ where: { id }, data: fields });
  } else await prisma.achievement.create({ data: { userId, ...fields } });
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

export async function deleteAchievement(id: string): Promise<ActionResult> {
  return removeOwned("achievement", id);
}

export async function saveLeadership(input: Record<string, string | undefined>): Promise<ActionResult> {
  const parsed = z
    .object({
      id: z.string().optional(),
      role: z.string().trim().min(1, "Add the role.").max(120),
      organization: z.string().trim().max(120),
      description: z.string().trim().max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const userId = await viewerId();
  const prisma = await db();
  const { id, ...fields } = parsed.data;
  if (id) {
    const owned = await prisma.leadership.findFirst({ where: { id, userId } });
    if (!owned) return { ok: false, error: "Leadership role not found." };
    await prisma.leadership.update({ where: { id }, data: fields });
  } else await prisma.leadership.create({ data: { userId, ...fields } });
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

export async function deleteLeadership(id: string): Promise<ActionResult> {
  return removeOwned("leadership", id);
}

export async function saveHackathon(input: Record<string, string | undefined>): Promise<ActionResult> {
  const parsed = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(1, "Name the hackathon.").max(140),
      result: z.string().trim().max(80),
      description: z.string().trim().max(1000),
      projectName: z.string().trim().max(120),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const userId = await viewerId();
  const prisma = await db();
  const { id, ...fields } = parsed.data;
  if (id) {
    const owned = await prisma.hackathon.findFirst({ where: { id, userId } });
    if (!owned) return { ok: false, error: "Hackathon not found." };
    await prisma.hackathon.update({ where: { id }, data: fields });
  } else await prisma.hackathon.create({ data: { userId, ...fields } });
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

export async function deleteHackathon(id: string): Promise<ActionResult> {
  return removeOwned("hackathon", id);
}

async function saveRole(kind: "experience" | "internship", input: Record<string, string | undefined>): Promise<ActionResult> {
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issue(parsed.error) };
  const userId = await viewerId();
  const prisma = await db();
  const { id, ...fields } = parsed.data;
  if (kind === "experience") {
    if (id) {
      const owned = await prisma.experience.findFirst({ where: { id, userId } });
      if (!owned) return { ok: false, error: "Record not found." };
      await prisma.experience.update({ where: { id }, data: fields });
    } else await prisma.experience.create({ data: { userId, ...fields } });
  } else if (id) {
    const owned = await prisma.internship.findFirst({ where: { id, userId } });
    if (!owned) return { ok: false, error: "Record not found." };
    await prisma.internship.update({ where: { id }, data: fields });
  } else await prisma.internship.create({ data: { userId, ...fields } });
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

async function removeOwned(
  kind: "skill" | "project" | "certification" | "experience" | "internship" | "achievement" | "leadership" | "hackathon",
  id: string,
): Promise<ActionResult> {
  const userId = await viewerId();
  const prisma = await db();
  const where = { id, userId };
  const found =
    kind === "skill" ? await prisma.skill.findFirst({ where }) :
    kind === "project" ? await prisma.project.findFirst({ where }) :
    kind === "certification" ? await prisma.certification.findFirst({ where }) :
    kind === "experience" ? await prisma.experience.findFirst({ where }) :
    kind === "internship" ? await prisma.internship.findFirst({ where }) :
    kind === "achievement" ? await prisma.achievement.findFirst({ where }) :
    kind === "leadership" ? await prisma.leadership.findFirst({ where }) :
    await prisma.hackathon.findFirst({ where });
  if (!found) return { ok: false, error: "That item is no longer on your profile." };
  if (kind === "skill") await prisma.skill.delete({ where: { id } });
  else if (kind === "project") await prisma.project.delete({ where: { id } });
  else if (kind === "certification") await prisma.certification.delete({ where: { id } });
  else if (kind === "experience") await prisma.experience.delete({ where: { id } });
  else if (kind === "internship") await prisma.internship.delete({ where: { id } });
  else if (kind === "achievement") await prisma.achievement.delete({ where: { id } });
  else if (kind === "leadership") await prisma.leadership.delete({ where: { id } });
  else await prisma.hackathon.delete({ where: { id } });
  await touchUser(userId);
  revalidateApp();
  return { ok: true };
}

function parseNumber(value: string, min: number, max: number, label: string): ActionResult<{ value: number | null }> {
  const text = value.trim();
  if (!text) return { ok: true, value: null };
  const number = Number(text);
  if (!Number.isFinite(number) || number < min || number > max) {
    return { ok: false, error: `${label} should be between ${min} and ${max}.` };
  }
  return { ok: true, value: number };
}
