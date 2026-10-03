import { describe, expect, it } from "vitest";
import { parseProfileForm } from "./form";

const base = {
  stage: "new_idea", businessType: "home_food", product: "custom cakes", city: "Pune", locality: "Kothrud",
  premises: "home", sellsOnline: "true", targetCustomer: "", budgetInr: "30,000", hoursPerDay: "4", expectedMonthlySalesInr: "",
};

describe("profile card form", () => {
  it("accepts the bakery profile and recomputes missing fields", () => {
    const r = parseProfileForm(base, "mr");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile).toMatchObject({ budgetInr: 30000, hoursPerDay: 4, sellsOnline: true, targetCustomer: null, language: "mr" });
    expect(r.profile.missingFields).toEqual(["targetCustomer", "expectedMonthlySalesInr"]);
  });

  it("shows inline errors for a negative budget, bad hours and an empty product", () => {
    const r = parseProfileForm({ ...base, budgetInr: "-500", hoursPerDay: "30", product: "  " }, "en");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toMatchObject({ budgetInr: "nonNegative", hoursPerDay: "hoursRange", product: "required" });
  });

  it("rejects text in number fields and an unsupported business type", () => {
    const r = parseProfileForm({ ...base, budgetInr: "lots", businessType: "other" }, "en");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toMatchObject({ budgetInr: "number", businessType: "supportedType" });
  });

  it("switching home → shop is a valid edit", () => {
    const r = parseProfileForm({ ...base, premises: "shop" }, "en");
    expect(r.ok && r.profile.premises).toBe("shop");
  });
});
