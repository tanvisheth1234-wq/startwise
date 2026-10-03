import { describe, expect, it } from "vitest";
import { FIXTURE_CHECKLIST, FIXTURE_ROADMAP } from "@/fixtures/home-bakery";
import { clampScore, complianceSummary, dueSoon, isOverdue, resolvePlanHref, roadmapSummary } from "./summaries";

describe("dashboard summaries", () => {
  it("resolves relative and absolute task links", () => {
    expect(resolvePlanHref("p1", "validate")).toBe("/plan/p1/validate");
    expect(resolvePlanHref("p1", "roadmap#task-3")).toBe("/plan/p1/roadmap#task-3");
    expect(resolvePlanHref("p1", "/plan/p1/money")).toBe("/plan/p1/money");
    expect(resolvePlanHref("p1", "https://foscos.fssai.gov.in/")).toBe("https://foscos.fssai.gov.in/");
    expect(resolvePlanHref("p1", "")).toBe("/plan/p1");
  });

  it("counts licences and verified ones", () => {
    expect(complianceSummary(FIXTURE_CHECKLIST)).toEqual({ licences: 3, verified: 0 });
    expect(complianceSummary([{ ...FIXTURE_CHECKLIST[0], status: "verified" }])).toEqual({ licences: 1, verified: 1 });
  });

  it("counts done tasks", () => {
    expect(roadmapSummary(FIXTURE_ROADMAP)).toEqual({ done: 0, total: 5 });
    expect(roadmapSummary([{ ...FIXTURE_ROADMAP[0], status: "done" }, FIXTURE_ROADMAP[1]])).toEqual({ done: 1, total: 2 });
  });

  it("lists open tasks due within 7 days, overdue first, never done ones", () => {
    const today = new Date("2026-10-04T10:00:00");
    const tasks = [
      { ...FIXTURE_ROADMAP[0], id: "a", dueDate: "2026-10-09" },
      { ...FIXTURE_ROADMAP[1], id: "b", dueDate: "2026-10-02" },
      { ...FIXTURE_ROADMAP[2], id: "c", dueDate: "2026-10-20" },
      { ...FIXTURE_ROADMAP[3], id: "d", dueDate: "2026-10-05", status: "done" as const },
      { ...FIXTURE_ROADMAP[4], id: "e", dueDate: null },
      { ...FIXTURE_ROADMAP[4], id: "f", dueDate: "2026-10-11" },
    ];
    expect(dueSoon(tasks, today).map((t) => t.id)).toEqual(["b", "a", "f"]);
    expect(isOverdue(tasks[1], today)).toBe(true);
    expect(isOverdue(tasks[0], today)).toBe(false);
  });

  it("clamps the score", () => {
    expect([clampScore(-5), clampScore(42.6), clampScore(130), clampScore(NaN)]).toEqual([0, 43, 100, 0]);
  });
});
