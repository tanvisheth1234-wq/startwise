import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  // Supabase manages these; never let push/migrate touch them.
  schemaFilter: ["public"],
  extensionsFilters: ["postgis"],
  strict: true,
  verbose: true,
});
