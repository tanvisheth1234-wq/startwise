import { describe, expect, it } from "vitest";
import { BusinessProfile } from "@/contracts/profile";
import { DRAFT_SCHEMAS } from "@/contracts/sections";
import type { DraftKind } from "@/contracts/ai";
import { FIXTURE_DRAFTS, FIXTURE_PROFILE } from "./home-bakery";

describe("home-bakery fixtures", () => {
  it("profile passes the BusinessProfile schema", () => {
    expect(BusinessProfile.parse(FIXTURE_PROFILE)).toEqual(FIXTURE_PROFILE);
  });

  it("every draft fixture passes its section schema", () => {
    for (const kind of Object.keys(DRAFT_SCHEMAS) as DraftKind[]) {
      expect(() => DRAFT_SCHEMAS[kind].parse(FIXTURE_DRAFTS[kind])).not.toThrow();
    }
  });
});
