// src/fixtures/home-bakery.ts   (SHARED)
// Fake outputs for the Phase 0 stubs. Every visible text says "(FIXTURE)" so a stub
// can never be mistaken for real data. Before the final checkpoint no screen may show it.
import type { BusinessProfile } from "@/contracts/profile";
import type { ChecklistItem } from "@/contracts/compliance";
import type { MoneySummary } from "@/contracts/money";
import type { SchemeMatch } from "@/contracts/funding";
import type { NextStep, RoadmapTask } from "@/contracts/roadmap";
import type { Readiness } from "@/contracts/readiness";
import type { ValidationStatus } from "@/contracts/validate";
import type { DraftKind } from "@/contracts/ai";
import type {
  Assumptions, CompetitionNotes, FirstCustomers, Health, LoanPitch, Niches, PlanStarter,
  RiskSnapshot, Templates, TestPlan,
} from "@/contracts/sections";

export const FIXTURE_PLAN_ID = "00000000-0000-4000-8000-000000000001";

export const FIXTURE_PROFILE: BusinessProfile = {
  stage: "new_idea",
  businessType: "home_food",
  product: "custom cakes and cookies (FIXTURE)",
  city: "Pune",
  locality: "Kothrud",
  premises: "home",
  sellsOnline: true,
  targetCustomer: "families ordering birthday cakes (FIXTURE)",
  budgetInr: 30000,
  hoursPerDay: 4,
  expectedMonthlySalesInr: 25000,
  language: "en",
  missingFields: [],
};

const FIXTURE_SOURCE = {
  key: "fssai_foscos",
  title: "FoSCoS – FSSAI (FIXTURE)",
  url: "https://foscos.fssai.gov.in/",
  lastVerified: null,
  status: "check_locally" as const,
};

export const FIXTURE_CHECKLIST: ChecklistItem[] = [
  {
    ruleKey: "fssai_basic_registration",
    name: "FSSAI Basic Registration (FIXTURE)",
    authority: "FSSAI (FIXTURE)",
    whyNeeded: "You sell food you make at home (FIXTURE).",
    explanation: "A basic food registration for small food businesses (FIXTURE).",
    costText: "Check on the portal (FIXTURE)",
    timeText: "Check on the portal (FIXTURE)",
    documents: ["Photo ID (FIXTURE)", "Address proof (FIXTURE)"],
    phase: "register",
    dependsOn: [],
    officialUrl: "https://foscos.fssai.gov.in/",
    source: FIXTURE_SOURCE,
    status: "check_locally",
    lastVerified: null,
    applies: "yes",
    reason: "Home food business (FIXTURE)",
  },
  {
    ruleKey: "udyam_registration",
    name: "Udyam Registration (FIXTURE)",
    authority: "Ministry of MSME (FIXTURE)",
    whyNeeded: "Optional, helps with schemes and loans (FIXTURE).",
    explanation: "A free online MSME registration (FIXTURE).",
    costText: null,
    timeText: null,
    documents: ["Aadhaar-linked mobile (FIXTURE)"],
    phase: "register",
    dependsOn: [],
    officialUrl: "https://udyamregistration.gov.in/",
    source: null,
    status: "check_locally",
    lastVerified: null,
    applies: "maybe",
    reason: "Useful if you apply for a scheme (FIXTURE)",
  },
  {
    ruleKey: "gst_registration",
    name: "GST Registration (FIXTURE)",
    authority: "GST Council (FIXTURE)",
    whyNeeded: "Only above a turnover limit or for some online sales (FIXTURE).",
    explanation: "Tax registration, needed only in some cases (FIXTURE).",
    costText: null,
    timeText: null,
    documents: [],
    phase: "register",
    dependsOn: ["udyam_registration"],
    officialUrl: "https://www.gst.gov.in/",
    source: null,
    status: "check_locally",
    lastVerified: null,
    applies: "maybe",
    reason: "Depends on your sales and channels (FIXTURE)",
  },
];

export const FIXTURE_MONEY: MoneySummary = {
  startupTotal: 28000,
  monthlyFixed: 3000,
  unitCost: 250,
  price: 600,
  marginPerUnit: 350,
  breakEvenUnitsPerMonth: 9,
  monthsToRecoverStartup: 6,
  loanNeed: 0,
  isEstimate: true,
};

export const FIXTURE_ROADMAP: RoadmapTask[] = [
  { id: "fx-task-1", key: "validate.test_sprint", title: "Run a 7-day test sprint (FIXTURE)", phase: "validate", category: "market", status: "pending", locked: false, dueDate: null, notes: null, evidenceUrl: null },
  { id: "fx-task-2", key: "prepare.kitchen_setup", title: "Set up a clean baking area (FIXTURE)", phase: "prepare", category: "operations", status: "upcoming", locked: true, dueDate: null, notes: null, evidenceUrl: null },
  { id: "fx-task-3", key: "rule:fssai_basic_registration", title: "Apply for FSSAI Basic Registration (FIXTURE)", phase: "register", category: "legal", status: "upcoming", locked: true, dueDate: null, notes: null, evidenceUrl: null },
  { id: "fx-task-4", key: "pilot.first_ten_orders", title: "Deliver your first 10 orders (FIXTURE)", phase: "pilot", category: "market", status: "upcoming", locked: true, dueDate: null, notes: null, evidenceUrl: null },
  { id: "fx-task-5", key: "launch.whatsapp_catalogue", title: "Publish a WhatsApp Business catalogue (FIXTURE)", phase: "launch", category: "market", status: "upcoming", locked: true, dueDate: null, notes: null, evidenceUrl: null },
];

export const FIXTURE_NEXT_STEP: NextStep = {
  taskId: "fx-task-1",
  title: "Run a 7-day test sprint (FIXTURE)",
  href: "validate",
};

export const FIXTURE_SCHEMES: SchemeMatch[] = [
  {
    schemeKey: "pmegp",
    applies: "maybe",
    name: "PMEGP (FIXTURE)",
    provider: "KVIC (FIXTURE)",
    benefit: "Subsidy on a bank loan for a new unit (FIXTURE)",
    whyMatched: "You are starting a new business (FIXTURE)",
    documents: ["Project report (FIXTURE)"],
    womenFocused: false,
    officialUrl: "https://www.kviconline.gov.in/pmegpeportal/",
    source: null,
  },
  {
    schemeKey: "stand_up_india",
    applies: "maybe",
    name: "Stand-Up India (FIXTURE)",
    provider: "SIDBI (FIXTURE)",
    benefit: "Bank loans for women entrepreneurs (FIXTURE)",
    whyMatched: "Women-focused scheme (FIXTURE)",
    documents: [],
    womenFocused: true,
    officialUrl: "https://www.standupmitra.in/",
    source: null,
  },
];

export const FIXTURE_READINESS: Readiness = {
  score: 35,
  parts: { legal: 20, money: 40, market: 30, operations: 50 },
  blockers: [
    { label: "FSSAI registration not started (FIXTURE)", href: "compliance" },
    { label: "Test sprint not finished (FIXTURE)", href: "validate" },
  ],
};

export const FIXTURE_VALIDATION: ValidationStatus = {
  sprintStarted: false,
  verdict: "pending",
  enquiries: 0,
  orders: 0,
};

const FIXTURE_ASSUMPTIONS: Assumptions = {
  items: [
    { text: "People in Kothrud will pre-order custom cakes (FIXTURE)", kind: "must_be_true", howToCheck: "Ask 10 neighbours (FIXTURE)" },
    { text: "₹600 per cake is acceptable (FIXTURE)", kind: "open_question", howToCheck: "Share a price card (FIXTURE)" },
  ],
};

const FIXTURE_RISK: RiskSnapshot = {
  strengths: ["Low start-up cost (FIXTURE)"],
  unknowns: ["Weekly demand (FIXTURE)"],
  risks: [{ area: "operations", text: "Oven capacity on festival days (FIXTURE)", evidenceNeeded: "Bake a full batch in 4 hours (FIXTURE)" }],
};

const FIXTURE_TEST_PLAN: TestPlan = {
  days: [1, 2, 3, 4, 5, 6, 7].map((d) => ({
    day: d as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    experiment: "whatsapp_status" as const,
    action: `Day ${d} action (FIXTURE)`,
    costInr: 50,
  })),
  targets: { enquiries: 10, orders: 3 },
  startDate: null,
};

const FIXTURE_TEMPLATES: Templates = {
  whatsappMessage: "Hello! I bake custom cakes at home in Kothrud (FIXTURE).",
  poll: { question: "Which cake would you order? (FIXTURE)", options: ["Chocolate", "Fruit", "Eggless"] },
  priceCard: "Custom cake 1 kg – ₹600 (FIXTURE)",
};

export const FIXTURE_DRAFTS: Record<DraftKind, unknown> = {
  assumptions: FIXTURE_ASSUMPTIONS,
  risk: FIXTURE_RISK,
  test_plan: FIXTURE_TEST_PLAN,
  templates: FIXTURE_TEMPLATES,
  niches: { items: [{ product: "Eggless birthday cakes (FIXTURE)", targetCustomer: "Parents in Kothrud (FIXTURE)", reason: "Many families prefer eggless (FIXTURE)" }] } satisfies Niches,
  health: { working: ["Repeat customers (FIXTURE)"], gaps: ["No online presence (FIXTURE)"], nextActions: ["Open a WhatsApp catalogue (FIXTURE)"] } satisfies Health,
  first_customers: { approachFirst: [{ who: "Neighbours (FIXTURE)", why: "They trust you (FIXTURE)", whatToSay: "Try my cakes this weekend (FIXTURE)" }], experiments: [{ title: "Weekend tasting (FIXTURE)", steps: ["Bake 10 samples (FIXTURE)"] }] } satisfies FirstCustomers,
  plan_starter: { problem: "Hard to find fresh custom cakes nearby (FIXTURE)", customer: "Families in Kothrud (FIXTURE)", offer: "Custom cakes made to order (FIXTURE)", price: "₹600 per kg (FIXTURE)", channels: ["WhatsApp (FIXTURE)"], next30Days: ["Run the test sprint (FIXTURE)"] } satisfies PlanStarter,
  loan_pitch: { summary: "A home bakery in Kothrud (FIXTURE)", keyPoints: ["Low cost (FIXTURE)"], askText: "Working capital (FIXTURE)" } satisfies LoanPitch,
  competition_notes: { summary: "A few bakeries nearby (FIXTURE)", notes: ["Most do not offer eggless (FIXTURE)"] } satisfies CompetitionNotes,
};
