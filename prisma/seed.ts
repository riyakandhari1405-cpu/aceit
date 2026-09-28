import { db } from "../lib/db";

async function main() {
  await db();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
