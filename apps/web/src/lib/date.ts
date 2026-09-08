/**
 * Date & Timezone Utilities for Swan Swim Management (Web Portal)
 *
 * Physical facilities operate strictly in Ontario, Canada (America/Toronto).
 * These helpers guarantee deterministic Toronto business day calculations
 * regardless of whether code executes on Vercel (UTC) or client browsers.
 */

export const BUSINESS_TIMEZONE = "America/Toronto";

/**
 * Returns the current calendar date in America/Toronto as a "YYYY-MM-DD" string.
 *
 * Example: At 8:30 PM EDT on September 7 in Toronto, returns "2026-09-07"
 * (preventing UTC rollover from advancing to "2026-09-08").
 */
export function getTorontoDateString(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: BUSINESS_TIMEZONE });
}

/**
 * Returns today's date in Toronto as "YYYY-MM-DD".
 */
export function todayInToronto(): string {
  return getTorontoDateString(new Date());
}

/**
 * Safely formats a "YYYY-MM-DD" date string for UI display without timezone shifting.
 */
export function formatCalendarDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  if (!dateStr) return "";
  const cleanStr = dateStr.split("T")[0];
  const [year, month, day] = cleanStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;

  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return utcDate.toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}
