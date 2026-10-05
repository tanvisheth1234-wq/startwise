// src/contracts/sections.ts   (SHARED, frozen)
// Shapes of plan_sections.content, one per kind. ai.draft(kind, ...) returns
// data that passes the matching schema in DRAFT_SCHEMAS.
import { z } from "zod";
import type { DraftKind } from "./ai";

export const Assumptions = z.object({
  items: z.array(z.object({
    text: z.string(),
    kind: z.enum(["must_be_true", "open_question"]),
    howToCheck: z.string(),
  })).min(1).max(12), // aim for 5–8
});
export type Assumptions = z.infer<typeof Assumptions>;

export const RiskSnapshot = z.object({
  strengths: z.array(z.string()),
  unknowns: z.array(z.string()),
  risks: z.array(z.object({
    area: z.enum(["operations", "market", "money", "execution"]),
    text: z.string(),
    evidenceNeeded: z.string(),
  })),
});
export type RiskSnapshot = z.infer<typeof RiskSnapshot>;

export const Experiment = z.enum(["interviews", "pre_orders", "pilot_offer", "landing_page", "whatsapp_status"]);
export const TestPlan = z.object({
  days: z.array(z.object({
    day: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
    experiment: Experiment,
    action: z.string(),
    costInr: z.number().int().nonnegative(),
    done: z.boolean().optional(), // ticked off by the founder during the sprint
  })),
  targets: z.object({ enquiries: z.number().int().nonnegative(), orders: z.number().int().nonnegative() }),
  startDate: z.string().nullable().optional(), // ISO date, set when the sprint starts
});
export type TestPlan = z.infer<typeof TestPlan>;

export const Templates = z.object({
  whatsappMessage: z.string(),
  poll: z.object({ question: z.string(), options: z.array(z.string()) }),
  priceCard: z.string(),
});
export type Templates = z.infer<typeof Templates>;

export const Niches = z.object({
  items: z.array(z.object({ product: z.string(), targetCustomer: z.string(), reason: z.string() })),
});
export type Niches = z.infer<typeof Niches>;

export const Health = z.object({
  working: z.array(z.string()),
  gaps: z.array(z.string()),
  nextActions: z.array(z.string()),
});
export type Health = z.infer<typeof Health>;

export const FirstCustomers = z.object({
  approachFirst: z.array(z.object({ who: z.string(), why: z.string(), whatToSay: z.string() })),
  experiments: z.array(z.object({ title: z.string(), steps: z.array(z.string()) })),
  // Feedback log the founder fills in (never AI-written).
  feedback: z.array(z.object({ customer: z.string(), said: z.string(), change: z.string(), date: z.string() })).optional(),
});
export type FirstCustomers = z.infer<typeof FirstCustomers>;

export const PlanStarter = z.object({
  problem: z.string(),
  customer: z.string(),
  offer: z.string(),
  price: z.string(),
  channels: z.array(z.string()),
  next30Days: z.array(z.string()),
});
export type PlanStarter = z.infer<typeof PlanStarter>;

export const LoanPitch = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  askText: z.string(),
});
export type LoanPitch = z.infer<typeof LoanPitch>;

export const CompetitionNotes = z.object({
  summary: z.string(),
  notes: z.array(z.string()),
});
export type CompetitionNotes = z.infer<typeof CompetitionNotes>;

export const DRAFT_SCHEMAS = {
  assumptions: Assumptions,
  risk: RiskSnapshot,
  test_plan: TestPlan,
  templates: Templates,
  niches: Niches,
  health: Health,
  first_customers: FirstCustomers,
  plan_starter: PlanStarter,
  loan_pitch: LoanPitch,
  competition_notes: CompetitionNotes,
} satisfies Record<DraftKind, z.ZodType>;

// All plan_sections.kind values (drafts plus user-only sections).
export type SectionKind = DraftKind | "market";
