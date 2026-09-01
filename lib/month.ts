/**
 * Calendar-month helpers.
 *
 * The expense tracker groups everything by calendar month, whereas the
 * Credit Card Manager groups by its 16th→15th billing cycle. Both read the
 * same rows; they just slice them along different boundaries. A "month key"
 * here is always the string "YYYY-MM".
 */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** "YYYY-MM" for the caller's local today. */
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

/** The local current year. */
export function currentYear(): number {
  return new Date().getFullYear();
}

/** "YYYY-MM" for a "YYYY-MM-DD" date, with no timezone conversion. */
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

/** "2026-08" → "August 2026" */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}




/** "2026-09" → "2026-09-01", the storage form for a salary month. */
export function monthKeyToDate(monthKey: string): string {
  return `${monthKey}-01`;
}

/** "2026-09-01" → "2026-09" */
export function dateToMonthKey(date: string): string {
  return date.slice(0, 7);
}

/** Steps a month key forward or backward by `delta` months. */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const zeroBased = year * 12 + (month - 1) + delta;
  return `${Math.floor(zeroBased / 12)}-${pad2((zeroBased % 12) + 1)}`;
}


/** Number of days in a month key. */
export function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

/**
 * How many days of `monthKey` have actually happened. For the current month
 * that is today's date; for a past month, the whole month; for a future
 * month, zero. Used for "average daily spending", which would otherwise be
 * misleadingly low on the 2nd of the month.
 */
export function elapsedDaysInMonth(monthKey: string): number {
  const current = currentMonthKey();
  if (monthKey > current) return 0;
  if (monthKey < current) return daysInMonth(monthKey);
  return new Date().getDate();
}

/** Local today as "YYYY-MM-DD". */
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** "2026-08-30" → "30 Aug" */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTH_ABBR[month - 1]}`;
}

/** "2026-08-30" → "30 Aug 2026" */
export function formatFullDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTH_ABBR[month - 1]} ${year}`;
}
