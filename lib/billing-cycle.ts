/**
 * Billing-cycle date logic.
 *
 * The credit card statement closes on the 15th of every month, so each
 * tracker covers the 16th of one month through the 15th of the next.
 *
 * All dates are handled as plain calendar dates (YYYY-MM-DD strings) using
 * the caller's LOCAL date/time (never UTC-shifted), since a billing cycle is
 * a calendar concept, not a point in time.
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function ymd(year: number, month1: number, day: number): string {
  // month1 is 1-indexed
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

export interface CycleWindow {
  start_date: string;
  end_date: string;
}

/** Returns the caller's local "today" as {year, month1, day}. */
export function localToday(): { year: number; month1: number; day: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month1: now.getMonth() + 1,
    day: now.getDate(),
  };
}

/**
 * Determines the billing-cycle window that a given local calendar date
 * falls into.
 *   - day <= 15  -> cycle is (previous month 16) -> (this month 15)
 *   - day >= 16  -> cycle is (this month 16) -> (next month 15)
 */
export function cycleWindowForDate(year: number, month1: number, day: number): CycleWindow {
  if (day <= 15) {
    let startYear = year;
    let startMonth = month1 - 1;
    if (startMonth === 0) {
      startMonth = 12;
      startYear = year - 1;
    }
    return {
      start_date: ymd(startYear, startMonth, 16),
      end_date: ymd(year, month1, 15),
    };
  }

  let endYear = year;
  let endMonth = month1 + 1;
  if (endMonth === 13) {
    endMonth = 1;
    endYear = year + 1;
  }
  return {
    start_date: ymd(year, month1, 16),
    end_date: ymd(endYear, endMonth, 15),
  };
}

/** The billing-cycle window for "right now", in the server's local time. */
export function currentCycleWindow(): CycleWindow {
  const { year, month1, day } = localToday();
  return cycleWindowForDate(year, month1, day);
}

/** Today's local calendar date as a YYYY-MM-DD string. */
export function todayIsoDateLocal(): string {
  const { year, month1, day } = localToday();
  return ymd(year, month1, day);
}

/**
 * A cycle can only be manually closed once its statement date (the 15th)
 * has actually passed — closing early would cut off expenses that still
 * belong in this cycle. True once "today" is the 16th or later relative to
 * the cycle's end_date.
 */
export function isCycleClosable(endDate: string): boolean {
  return todayIsoDateLocal() > endDate;
}

/**
 * The cycle window that immediately follows the given cycle's end date.
 * Since a cycle's end_date is always the 15th of some month by
 * construction, the next cycle is simply (that month 16) -> (next month 15).
 */
export function nextCycleWindow(prevEndDate: string): CycleWindow {
  const [yearStr, monthStr] = prevEndDate.split("-");
  const year = Number(yearStr);
  const month1 = Number(monthStr);

  let endYear = year;
  let endMonth = month1 + 1;
  if (endMonth === 13) {
    endMonth = 1;
    endYear = year + 1;
  }
  return {
    start_date: ymd(year, month1, 16),
    end_date: ymd(endYear, endMonth, 15),
  };
}

const MONTH_NAMES = [
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

/** Formats a YYYY-MM-DD string as "Month D, YYYY" without any timezone conversion. */
export function formatDateLabel(isoDate: string): string {
  const [year, month1, day] = isoDate.split("-").map(Number);
  return `${MONTH_NAMES[month1 - 1]} ${day}, ${year}`;
}

/** Formats a cycle window as "August 16, 2026 → September 15, 2026". */
export function formatCycleLabel(window: CycleWindow): string {
  return `${formatDateLabel(window.start_date)} → ${formatDateLabel(window.end_date)}`;
}

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Formats a YYYY-MM-DD string as "D Mon YYYY", e.g. "29 Aug 2026". */
export function formatDateShort(isoDate: string): string {
  const [year, month1, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTH_ABBR[month1 - 1]} ${year}`;
}

/** Formats a YYYY-MM-DD string as "Mon D, YYYY", e.g. "Aug 29, 2026". */
export function formatDateMedium(isoDate: string): string {
  const [year, month1, day] = isoDate.split("-").map(Number);
  return `${MONTH_ABBR[month1 - 1]} ${day}, ${year}`;
}

/** Formats a cycle window compactly, e.g. "Sep 16 → Oct 15, 2026". */
export function formatCycleLabelShort(window: CycleWindow): string {
  const [startYear, startMonth1, startDay] = window.start_date.split("-").map(Number);
  const [endYear, endMonth1, endDay] = window.end_date.split("-").map(Number);
  const start = `${MONTH_ABBR[startMonth1 - 1]} ${startDay}`;
  const end = `${MONTH_ABBR[endMonth1 - 1]} ${endDay}`;
  return startYear === endYear
    ? `${start} → ${end}, ${endYear}`
    : `${start}, ${startYear} → ${end}, ${endYear}`;
}
