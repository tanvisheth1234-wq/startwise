import { describe, expect, it } from "vitest";
import type { BusinessProfile } from "@/contracts/profile";
import { selectRules } from "./engine";

const bakery: BusinessProfile = {
  stage: "new_idea", businessType: "home_food", product: "cakes", city: "Pune", locality: "Kothrud",
  premises: "home", sellsOnline: false, targetCustomer: null, budgetInr: 25000, hoursPerDay: 4,
  expectedMonthlySalesInr: null, language: "en", missingFields: [],
};
const keys = (p: BusinessProfile) => selectRules(p, "en").map((v) => v.rule.key);

describe("rule engine", () => {
  it("a new home bakery in Pune sees only what applies", () => {
    expect(keys(bakery)).toEqual(["fssai_basic_registration", "udyam_registration", "packaged_food_labels"]);
  });

  it("is deterministic: same profile, same answer", () => {
    expect(keys(bakery)).toEqual(keys({ ...bakery }));
  });

  it("bigger sales swap basic registration for the state licence and add GST", () => {
    const k = keys({ ...bakery, expectedMonthlySalesInr: 1_500_000 });
    expect(k).toContain("fssai_state_licence");
    expect(k).toContain("gst_registration");
    expect(k).not.toContain("fssai_basic_registration");
  });

  it("a shop adds shop registration and the Pune city licence", () => {
    const k = keys({ ...bakery, premises: "shop" });
    expect(k).toContain("mh_shop_establishment");
    expect(k).toContain("pmc_trade_licence");
  });

  it("unknown premises gives 'maybe' (check locally), never a guess", () => {
    const v = selectRules({ ...bakery, premises: null }, "en").find((x) => x.rule.key === "mh_shop_establishment");
    expect(v?.applies).toBe("maybe");
  });

  it("explains in the chosen language", () => {
    expect(selectRules(bakery, "mr")[0].reason).toMatch(/लागू/);
  });
});
