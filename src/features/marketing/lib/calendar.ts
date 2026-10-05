// src/features/marketing/lib/calendar.ts — pure helpers: next date for a weekday and a Google Calendar link.
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Next occurrence (today counts if the time is still ahead) of a weekday at HH:MM in India, as YYYYMMDDTHHMMSS. */
export function nextSlot(day: string, time: string, now: Date = new Date()): string {
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60_000);
  const [h, m] = time.split(":").map(Number);
  const target = DAYS.indexOf(day);
  let add = (target - ist.getDay() + 7) % 7;
  if (add === 0 && (ist.getHours() > h || (ist.getHours() === h && ist.getMinutes() >= m))) add = 7;
  const d = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate() + add, h, m);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

/** "Add to Google Calendar" link: the phone's calendar then reminds the founder like an alarm. */
export function googleCalendarUrl(title: string, details: string, start: string, minutes = 15): string {
  const s = new Date(Date.UTC(+start.slice(0, 4), +start.slice(4, 6) - 1, +start.slice(6, 8), +start.slice(9, 11), +start.slice(11, 13) + minutes));
  const p = (n: number) => String(n).padStart(2, "0");
  const end = `${s.getUTCFullYear()}${p(s.getUTCMonth() + 1)}${p(s.getUTCDate())}T${p(s.getUTCHours())}${p(s.getUTCMinutes())}00`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, details, dates: `${start}/${end}`, ctz: "Asia/Kolkata" });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
