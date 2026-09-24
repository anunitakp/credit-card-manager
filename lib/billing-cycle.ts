/**
 * Month-boundary logic for a card.
 *
 * A card has a bill day — the day of the month its bill falls due. It does
 * not slice spending into windows you have to think about: the only thing it
 * decides is *when the current month may be closed*. Everything you add goes
 * into the open month until you close it, whenever you choose to.
 *
 * A cycle's `end_date` is therefore its bill date, and `start_date` is the
 * day after the previous one. Both are stored so months chain without gaps,
 * but neither is shown in the interface.
 *
 * All dates are plain calendar dates (YYYY-MM-DD) in the caller's LOCAL
 * time, never UTC-shifted — a bill date is a calendar concept, not an
 * instant.
 */

/** The bill day used when a card does not specify one. */
export const DEFAULT_BILL_DAY = 15;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function ymd(year: number, month1: number, day: number): string {
  // month1 is 1-indexed
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function daysInMonth(year: number, month1: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month1, 0).getDate();
}

/**
 * The date a card's bill actually falls due in a given month.
 *
 * Clamped to the length of the month, so a card billed on the 31st bills on
 * 28 February rather than on a date that does not exist. That is why days
 * past 28 are allowed at all: "the last day of the month" is a real bill
 * date that plenty of cards use.
 */
export function billDateFor(year: number, month1: number, billDay: number): string {
  return ymd(year, month1, Math.min(billDay, daysInMonth(year, month1)));
}

/** Shifts a 1-indexed (year, month) pair by whole months. */
function shiftMonth(year: number, month1: number, by: number): { year: number; month1: number } {
  const zero = year * 12 + (month1 - 1) + by;
  return { year: Math.floor(zero / 12), month1: (zero % 12) + 1 };
}

/** Adds one calendar day to a YYYY-MM-DD string. */
function nextDay(isoDate: string): string {
  const [year, month1, day] = isoDate.split("-").map(Number);
  const d = new Date(year, month1 - 1, day + 1);
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
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
 * The month a given local calendar date falls into, for a card billed on
 * `billDay`.
 *
 * A date on the bill date itself belongs to the month that closes that day —
 * the bill is drawn at the end of it, so it is closable from the next day.
 */
export function cycleWindowForDate(
  year: number,
  month1: number,
  day: number,
  billDay: number = DEFAULT_BILL_DAY
): CycleWindow {
  const today = ymd(year, month1, day);
  const thisBill = billDateFor(year, month1, billDay);

  if (today <= thisBill) {
    const prev = shiftMonth(year, month1, -1);
    return {
      start_date: nextDay(billDateFor(prev.year, prev.month1, billDay)),
      end_date: thisBill,
    };
  }

  const next = shiftMonth(year, month1, 1);
  return {
    start_date: nextDay(thisBill),
    end_date: billDateFor(next.year, next.month1, billDay),
  };
}

/** The month a card is currently in, in the server's local time. */
export function currentCycleWindow(billDay: number = DEFAULT_BILL_DAY): CycleWindow {
  const { year, month1, day } = localToday();
  return cycleWindowForDate(year, month1, day, billDay);
}

/** Today's local calendar date as a YYYY-MM-DD string. */
export function todayIsoDateLocal(): string {
  const { year, month1, day } = localToday();
  return ymd(year, month1, day);
}

/**
 * Whether the open month may be closed yet.
 *
 * Close it whenever you like — as long as the card's bill date has actually
 * passed. Closing before then would cut off spending that still belongs to
 * the bill that has not been drawn.
 */
export function isCycleClosable(billDate: string): boolean {
  return todayIsoDateLocal() > billDate;
}

/**
 * The month that immediately follows the one that just closed.
 *
 * Derived from the previous bill date rather than recomputed from today, so
 * months always chain back-to-back with no gaps or overlaps even if a card
 * goes untouched — or unclosed — for a while.
 */
export function nextCycleWindow(
  prevEndDate: string,
  billDay: number = DEFAULT_BILL_DAY
): CycleWindow {
  const [year, month1] = prevEndDate.split("-").map(Number);
  const next = shiftMonth(year, month1, 1);
  return {
    start_date: nextDay(prevEndDate),
    end_date: billDateFor(next.year, next.month1, billDay),
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

/**
 * The month an archived cycle is filed under, e.g. "September 2026".
 *
 * Archives need *something* to tell them apart, and the bill month is the
 * one label that is meaningful without exposing a date range: it is the
 * month whose bill that cycle became.
 */
export function cycleMonthLabel(endDate: string): string {
  const [year, month1] = endDate.split("-").map(Number);
  return `${MONTH_NAMES[month1 - 1]} ${year}`;
}

/** "15th", "1st", "22nd" — a bill day reads as a date, not a count. */
export function ordinalDay(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}
