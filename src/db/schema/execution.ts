// src/db/schema/execution.ts   OWNER: T2
import { pgTable, pgEnum, uuid, text, integer, boolean, jsonb, date } from "drizzle-orm/pg-core";
import { plans, users, stamps } from "./core";
import { phaseEnum, categoryEnum } from "./knowledge";

export const taskStatusEnum = pgEnum("task_status", ["upcoming", "pending", "blocked", "done"]);

export const planTasks = pgTable("plan_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  key: text("key").notNull(), // template key or "rule:<ruleKey>"
  phase: phaseEnum("phase").notNull(), category: categoryEnum("category").notNull(),
  status: taskStatusEnum("status").notNull().default("upcoming"),
  blockedReason: text("blocked_reason"), notes: text("notes"), evidenceUrl: text("evidence_url"),
  dueDate: date("due_date"), sortOrder: integer("sort_order").notNull(),
  ...stamps,
}).enableRLS();

export const costItems = pgTable("cost_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  kind: text("kind").notNull(), // one_time | monthly | per_unit
  amountInr: integer("amount_inr").notNull(), isEstimate: boolean("is_estimate").notNull().default(true),
  ...stamps,
}).enableRLS();

export const scenarios = pgTable("scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // best | likely | worst | custom
  inputs: jsonb("inputs").notNull(), results: jsonb("results").notNull(),
  ...stamps,
}).enableRLS();

export const flags = pgTable("flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  targetType: text("target_type").notNull(), // rule | scheme | source
  targetKey: text("target_key").notNull(), message: text("message"),
  status: text("status").notNull().default("open"), // open | fixed | rejected
  reviewedBy: uuid("reviewed_by"), reviewedAt: date("reviewed_at"),
  ...stamps,
}).enableRLS();
