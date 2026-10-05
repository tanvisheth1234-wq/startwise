import { describe, expect, it } from "vitest";
import { decideVerdict } from "./verdict";

const targets = { enquiries: 10, orders: 3 };

describe("go / no-go verdict", () => {
  it("is pending before the sprint starts", () => {
    expect(decideVerdict(null, targets, [], "2026-10-04").verdict).toBe("pending");
  });

  it("goes as soon as the order target is met, even mid-week", () => {
    const r = decideVerdict("2026-10-01", targets, [{ day: "2026-10-02", enquiries: 4, orders: 3 }], "2026-10-03");
    expect(r.verdict).toBe("go");
  });

  it("waits until day 7 before saying no-go", () => {
    const r = decideVerdict("2026-10-01", targets, [{ day: "2026-10-02", enquiries: 2, orders: 0 }], "2026-10-04");
    expect(r).toEqual({ verdict: "pending", daysLeft: 4 });
  });

  it("interest but no buying → change price or offer", () => {
    const r = decideVerdict("2026-10-01", targets, [{ day: "2026-10-02", enquiries: 12, orders: 1 }], "2026-10-08");
    expect(r).toEqual({ verdict: "no_go", reason: "interest_not_buying" });
  });

  it("low interest → sharper niche or another area", () => {
    const r = decideVerdict("2026-10-01", targets, [{ day: "2026-10-02", enquiries: 3, orders: 0 }], "2026-10-08");
    expect(r).toEqual({ verdict: "no_go", reason: "low_interest" });
  });

  it("ignores results logged before a restart", () => {
    const r = decideVerdict("2026-10-05", targets, [{ day: "2026-10-02", enquiries: 9, orders: 5 }], "2026-10-06");
    expect(r.verdict).toBe("pending");
  });
});
