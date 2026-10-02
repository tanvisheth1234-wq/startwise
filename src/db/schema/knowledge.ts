// src/db/schema/knowledge.ts   OWNER: T2
import { pgTable, pgEnum, uuid, text, integer, boolean, jsonb, date, index, vector } from "drizzle-orm/pg-core";
import { stamps } from "./core";

export const verifyEnum = pgEnum("verify_status", ["verified", "check_locally"]);
export const phaseEnum = pgEnum("phase", ["validate", "prepare", "register", "pilot", "launch", "improve"]);
export const categoryEnum = pgEnum("task_category", ["legal", "money", "market", "operations"]);
type L = { en: string; hi: string; mr: string }; // text in 3 languages

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // "fssai_foscos"
  title: text("title").notNull(), url: text("url").notNull(), publisher: text("publisher"),
  lastVerified: date("last_verified"), status: verifyEnum("status").notNull().default("check_locally"),
  content: text("content"), // cleaned page text for retrieval
  ...stamps,
}).enableRLS();

export const sourceChunks = pgTable("source_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(), content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
}, (t) => [index("chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops"))]).enableRLS();

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // "fssai_basic_registration"
  name: text("name").notNull(), authority: text("authority").notNull(),
  appliesTo: jsonb("applies_to").notNull(), // RuleCondition (contracts/compliance.ts)
  whyNeeded: jsonb("why_needed").$type<L>().notNull(),
  explanation: jsonb("explanation").$type<L>().notNull(), // written + checked by a person
  costText: jsonb("cost_text").$type<L>(), timeText: jsonb("time_text").$type<L>(),
  documents: jsonb("documents").$type<L[]>().notNull().default([]),
  phase: phaseEnum("phase").notNull(), dependsOn: text("depends_on").array().notNull().default([]),
  officialUrl: text("official_url").notNull(),
  sourceId: uuid("source_id").references(() => sources.id),
  lastVerified: date("last_verified"), status: verifyEnum("status").notNull().default("check_locally"),
  verifyNotes: text("verify_notes"), // what is still marked VERIFY
  ...stamps,
}).enableRLS();

export const schemes = pgTable("schemes", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), name: text("name").notNull(), provider: text("provider").notNull(),
  benefit: jsonb("benefit").$type<L>().notNull(), eligibility: jsonb("eligibility").notNull(), // SchemeCondition
  whyTemplate: jsonb("why_template").$type<L>().notNull(), // "Matches because {reason}"
  documents: jsonb("documents").$type<L[]>().notNull().default([]),
  womenFocused: boolean("women_focused").notNull().default(false),
  officialUrl: text("official_url").notNull(), sourceId: uuid("source_id").references(() => sources.id),
  lastVerified: date("last_verified"), status: verifyEnum("status").notNull().default("check_locally"),
  ...stamps,
}).enableRLS();

export const taskTemplates = pgTable("task_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // "validate.test_sprint"
  phase: phaseEnum("phase").notNull(), category: categoryEnum("category").notNull(),
  title: jsonb("title").$type<L>().notNull(), description: jsonb("description").$type<L>(),
  dependsOn: text("depends_on").array().notNull().default([]),
  dayOffset: integer("day_offset").notNull().default(0), // for the 30/60/90 view
  appliesTo: jsonb("applies_to").notNull(), // { businessTypes, stages }
  ruleKey: text("rule_key"), // set when the task comes from a rule
  ...stamps,
}).enableRLS();
