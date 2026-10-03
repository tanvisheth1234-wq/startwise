import { describe, expect, it } from "vitest";
import { FIXTURE_PROFILE } from "@/fixtures/home-bakery";
import { applyQuickReply, findQuickReply, quickRepliesFor } from "./quickReplies";

describe("quick replies", () => {
  it("offers chips for premises, online, budget and hours only", () => {
    expect(quickRepliesFor("premises").map((q) => q.id)).toEqual(["home", "shop"]);
    expect(quickRepliesFor("budgetInr")).toHaveLength(4);
    expect(quickRepliesFor("locality")).toEqual([]);
    expect(quickRepliesFor(null)).toEqual([]);
  });

  it("only accepts chips we offered", () => {
    expect(findQuickReply("premises", "shop")?.value).toBe("shop");
    expect(findQuickReply("premises", "castle")).toBeNull();
    expect(findQuickReply("budgetInr", "home")).toBeNull();
  });

  it("applies a chip to the profile", () => {
    const next = applyQuickReply({ ...FIXTURE_PROFILE, premises: null }, findQuickReply("premises", "shop")!);
    expect(next.premises).toBe("shop");
    expect("missingFields" in next).toBe(false);
  });
});
