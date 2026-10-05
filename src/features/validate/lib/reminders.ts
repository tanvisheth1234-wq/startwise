// Reminders without push notifications: one calendar file (.ics) with a 10 AM reminder for each
// day of her 7-day test. Phones open it straight into Google Calendar or the phone calendar. Free.

export type ReminderDay = { date: string; title: string; detail: string }; // date: YYYY-MM-DD (India)

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// 10:00 India time = 04:30 UTC.
const at10 = (date: string) => `${date.replace(/-/g, "")}T043000Z`;
const at1030 = (date: string) => `${date.replace(/-/g, "")}T050000Z`;

export function buildIcs(days: ReminderDay[], stamp: string): string {
  const events = days.flatMap((d, i) => [
    "BEGIN:VEVENT",
    `UID:startwise-${d.date}-${i}@startwise.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${at10(d.date)}`,
    `DTEND:${at1030(d.date)}`,
    `SUMMARY:${esc(d.title)}`,
    `DESCRIPTION:${esc(d.detail)}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(d.title)}`,
    "END:VALARM",
    "END:VEVENT",
  ]);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StartWise//7-day test//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
}

/** YYYY-MM-DD plus n days. */
export function addDaysIso(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
