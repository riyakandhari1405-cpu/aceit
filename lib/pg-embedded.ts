import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = 55432;
const USER = "postgres";
const PASSWORD = "postgres";
const DATABASE = "aceit";

const globalForPg = globalThis as unknown as {
  pg?: EmbeddedPostgres;
  starting?: Promise<void>;
};

function portOpen(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const finish = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(700, () => finish(false));
  });
}

export async function startEmbeddedPostgres() {
  process.env.DATABASE_URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}?schema=public`;
  if (!globalForPg.starting) {
    globalForPg.starting = startEmbedded().catch((error) => {
      globalForPg.starting = undefined;
      throw error;
    });
  }
  await globalForPg.starting;
}

async function startEmbedded() {
  if (await portOpen(PORT)) return;

  const databaseDir = path.join(process.cwd(), "data", "pg");
  fs.mkdirSync(path.dirname(databaseDir), { recursive: true });
  console.log("Starting PostgreSQL for AceIt…");

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    authMethod: "scram-sha-256",
    onLog: () => {},
    onError: (message) => {
      const text = String(message ?? "");
      if (!text.trim()) return;
      if (/database system is ready|listening on|recycled/i.test(text)) return;
      console.error(text);
    },
  });
  globalForPg.pg = pg;

  if (!fs.existsSync(path.join(databaseDir, "PG_VERSION"))) {
    await pg.initialise();
  }
  await pg.start();

  const client = pg.getPgClient("postgres");
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DATABASE]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${client.escapeIdentifier(DATABASE)}`);
    }
  } finally {
    await client.end();
  }
}
