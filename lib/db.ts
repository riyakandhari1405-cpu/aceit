import "server-only";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { ensurePostgres, usesExternalDatabase } from "./pg";
import { seedIfEmpty } from "./seed";

const globalForDb = globalThis as unknown as {
  prisma?: PrismaClient;
  ready?: Promise<void>;
};

function pushSchema() {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const hash = crypto.createHash("sha256").update(fs.readFileSync(schemaPath)).digest("hex");
  const stampDir = path.join(process.cwd(), "data");
  fs.mkdirSync(stampDir, { recursive: true });
  const stampPath = path.join(stampDir, "schema-stamp");
  if (fs.existsSync(stampPath) && fs.readFileSync(stampPath, "utf8") === hash) return;
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  });
  fs.writeFileSync(stampPath, hash);
}

async function bootstrap() {
  await ensurePostgres();
  if (!usesExternalDatabase()) pushSchema();
  globalForDb.prisma = new PrismaClient({ log: ["error"] });
  await seedIfEmpty(globalForDb.prisma);
}

export async function db() {
  if (!globalForDb.ready) {
    globalForDb.ready = bootstrap().catch((error) => {
      globalForDb.ready = undefined;
      globalForDb.prisma = undefined;
      throw error;
    });
  }
  await globalForDb.ready;
  if (!globalForDb.prisma) throw new Error("Database failed to start.");
  return globalForDb.prisma;
}
