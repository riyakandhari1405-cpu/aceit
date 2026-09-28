export function usesExternalDatabase() {
  return process.env.VERCEL === "1" || process.env.EMBEDDED_PG === "0";
}

export async function ensurePostgres() {
  if (usesExternalDatabase()) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Set DATABASE_URL for this environment.");
    }
    return;
  }
  const { startEmbeddedPostgres } = await import("./pg-embedded");
  await startEmbeddedPostgres();
}
