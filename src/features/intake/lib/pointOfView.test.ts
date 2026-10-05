import { describe, expect, it } from "vitest";
import { asYours } from "./pointOfView";

describe("asYours", () => {
  it("turns her first-person words into 'your' for the business card", () => {
    expect(asYours("Families in my society", "en")).toBe("Families in your society");
    expect(asYours("My neighbours and our office", "en")).toBe("Your neighbours and your office");
  });

  it("leaves words that only contain 'my' alone", () => {
    expect(asYours("Mythili's academy", "en")).toBe("Mythili's academy");
  });

  it("works in Hindi and Marathi", () => {
    expect(asYours("मेरी सोसाइटी के परिवार", "hi")).toBe("आपकी सोसाइटी के परिवार");
    expect(asYours("माझ्या बिल्डिंगमधल्या बायका", "mr")).toBe("तुमच्या बिल्डिंगमधल्या बायका");
  });
});
