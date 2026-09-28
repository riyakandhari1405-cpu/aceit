import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "./password";

const CLEARED = path.join(process.cwd(), "data", "prototype-cleared");

export async function seedIfEmpty(prisma: PrismaClient) {
  if (process.env.VERCEL === "1" || process.env.EMBEDDED_PG === "0") {
    await ensureAdmin(prisma);
    return;
  }
  if (!fs.existsSync(CLEARED)) {
    await prisma.user.deleteMany({ where: { email: "ananya@aceit.dev" } });
    await prisma.companyInsight.deleteMany();
    await prisma.placementExperience.deleteMany();
    await prisma.placementQuestion.deleteMany();
    await prisma.placementRecord.deleteMany();
    fs.mkdirSync(path.dirname(CLEARED), { recursive: true });
    fs.writeFileSync(CLEARED, new Date().toISOString());
  }
  await ensureAdmin(prisma);
}

async function ensureAdmin(prisma: PrismaClient) {
  const email = (process.env.ADMIN_EMAIL || "admin@aceit.dev").toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const password = process.env.ADMIN_PASSWORD || (process.env.VERCEL === "1" ? "" : "aceit2026");
  if (!password) return;
  await prisma.user.create({
    data: {
      email,
      name: "Placement Office",
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      profile: { create: {} },
      education: { create: {} },
    },
  });
}
