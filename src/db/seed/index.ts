// src/db/seed/index.ts   (SHARED) — `npm run db:seed`
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  // Imported after dotenv so DATABASE_URL is set.
  const { db, pgClient } = await import("../client");
  const { seed } = await import("./data");
  await seed(db);
  await pgClient.end();
  console.log("Seed finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
