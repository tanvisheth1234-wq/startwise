// src/db/client.ts   (SHARED) — server code only.
// No "server-only" import here so the seed script (tsx) can use it too.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

// prepare:false is required by the Supabase transaction pooler.
const client = globalForDb.pgClient ?? postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { client as pgClient };
