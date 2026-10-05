import { describe, expect, it } from "vitest";
import { addDaysIso, buildIcs } from "./reminders";

describe("7-day test reminders", () => {
  it("adds days across month ends", () => {
    expect(addDaysIso("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("makes one 10 AM India event per day with an alarm", () => {
    const ics = buildIcs(
      [
        { date: "2026-10-06", title: "Day 1: Talk to people", detail: "Ask 5 neighbours, then log it" },
        { date: "2026-10-07", title: "Day 2: WhatsApp status", detail: "Post your picture" },
      ],
      "20261005T120000Z",
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20261006T043000Z");
    expect(ics).toContain("SUMMARY:Day 1: Talk to people");
    expect(ics).toContain("DESCRIPTION:Ask 5 neighbours\\, then log it");
    expect(ics).toContain("BEGIN:VALARM");
  });
});
