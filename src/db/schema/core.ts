// src/db/schema/core.ts   OWNER: T1
import { pgTable, pgEnum, uuid, text, integer, boolean, jsonb, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import type { BusinessProfile } from "@/contracts/profile";

export const langEnum = pgEnum("lang", ["en", "hi", "mr"]);
export const stageEnum = pgEnum("plan_stage", ["new_idea", "existing"]);

export const stamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by"), // user who last changed the row
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  preferredLanguage: langEnum("preferred_language").notNull().default("en"),
  ...stamps,
}).enableRLS();

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // "Home bakery · Pune"
  stage: stageEnum("stage").notNull().default("new_idea"),
  status: text("status").notNull().default("draft"), // draft | confirmed
  ideaText: text("idea_text"), // the confirmed transcript
  profile: jsonb("profile").$type<BusinessProfile>(),
  language: langEnum("language").notNull().default("en"),
  readinessScore: integer("readiness_score"), // written by T2 readiness
  shareToken: text("share_token").unique(), // P2 read-only share link (#43)
  ...stamps,
}).enableRLS();

// AI-drafted, user-editable sections. One row per (plan, kind, language).
// kinds: assumptions | risk | test_plan | templates | niches | health | market
//      | first_customers | plan_starter | loan_pitch (loan_pitch written by T2)
export const planSections = pgTable("plan_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  language: langEnum("language").notNull(),
  content: jsonb("content").notNull(), // shape = zod schema in contracts/sections.ts
  editedByUser: boolean("edited_by_user").notNull().default(false),
  ...stamps,
}, (t) => [uniqueIndex("plan_sections_unique").on(t.planId, t.kind, t.language)]).enableRLS();

export const testResults = pgTable("test_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  enquiries: integer("enquiries").notNull().default(0),
  orders: integer("orders").notNull().default(0),
  note: text("note"),
  ...stamps,
}).enableRLS();
