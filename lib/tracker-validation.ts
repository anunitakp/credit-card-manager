import {
  BonusInput,
  BudgetInput,
  CATEGORIES,
  Category,
  NoteInput,
  SalaryAllocationInput,
  SalaryMonthInput,
  TRIP_CATEGORIES,
  TripCategory,
  TripExpenseLinkInput,
  TripInput,
  UpiExpenseInput,
} from "./types";
import { ValidationError } from "./validation";

export { ValidationError };

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be an object.");
  }
  return body as Record<string, unknown>;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseAmount(raw: unknown, label: string): number {
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ValidationError(`${label} must be a number of 0 or more.`);
  }
  return round2(amount);
}

function parseCategory(raw: unknown): Category {
  if (!CATEGORIES.includes(raw as Category)) {
    throw new ValidationError("Category must be one of the predefined options.");
  }
  return raw as Category;
}

export function parseUpiExpenseInput(body: unknown): UpiExpenseInput {
  const b = asObject(body);

  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (!description) {
    throw new ValidationError("Please describe the expense.");
  }

  if (!isIsoDate(b.expense_date)) {
    throw new ValidationError("Expense date is required and must be a valid date.");
  }

  return {
    description: description.slice(0, 200),
    category: parseCategory(b.category),
    amount: parseAmount(b.amount, "Amount"),
    expense_date: b.expense_date,
  };
}

export function parseBudgetInput(body: unknown): BudgetInput {
  const b = asObject(body);

  const category =
    b.category === null || b.category === undefined || b.category === ""
      ? null
      : parseCategory(b.category);

  return {
    category,
    amount: parseAmount(b.amount, "Budget"),
  };
}

export function parseTripInput(body: unknown): TripInput {
  const b = asObject(body);

  const place = typeof b.place === "string" ? b.place.trim() : "";
  if (!place) {
    throw new ValidationError("Please enter where the trip was.");
  }
  if (!isIsoDate(b.trip_date)) {
    throw new ValidationError("Trip date is required and must be a valid date.");
  }

  const notes = typeof b.notes === "string" ? b.notes.trim() : "";

  return {
    trip_date: b.trip_date,
    place: place.slice(0, 120),
    total_amount: parseAmount(b.total_amount, "Total expense"),
    notes: notes === "" ? null : notes.slice(0, 2000),
  };
}

export function parseNoteInput(body: unknown): NoteInput {
  const b = asObject(body);

  const title = typeof b.title === "string" ? b.title.trim() : "";
  const content = typeof b.content === "string" ? b.content : "";

  if (!title && !content.trim()) {
    throw new ValidationError("A note needs a title or some content.");
  }

  return {
    title: (title || "Untitled").slice(0, 160),
    content: content.slice(0, 20000),
  };
}

/* ------------------------------------------------------------------ */
/* Salary                                                              */
/* ------------------------------------------------------------------ */

/** Months are stored as the first day of the month, e.g. 2026-09-01. */
function parseMonth(raw: unknown): string {
  if (!isIsoDate(raw) || !raw.endsWith("-01")) {
    throw new ValidationError("Month must be the first day of a month (YYYY-MM-01).");
  }
  return raw;
}

export function parseSalaryMonthInput(body: unknown): SalaryMonthInput {
  const b = asObject(body);
  const notes = typeof b.notes === "string" ? b.notes.trim() : "";

  return {
    month: parseMonth(b.month),
    amount: parseAmount(b.amount, "Salary"),
    notes: notes === "" ? null : notes.slice(0, 500),
  };
}

export function parseAllocationInput(body: unknown): SalaryAllocationInput {
  const b = asObject(body);

  const label = typeof b.label === "string" ? b.label.trim() : "";
  if (!label) {
    throw new ValidationError("Give this a name, e.g. Rent or Savings.");
  }

  return {
    month: parseMonth(b.month),
    label: label.slice(0, 80),
    amount: parseAmount(b.amount, "Amount"),
  };
}

export function parseBonusInput(body: unknown): BonusInput {
  const b = asObject(body);

  const label = typeof b.label === "string" ? b.label.trim() : "";
  if (!label) {
    throw new ValidationError("Give this bonus a name.");
  }
  if (!isIsoDate(b.received_on)) {
    throw new ValidationError("Choose the date the bonus arrived.");
  }

  const notes = typeof b.notes === "string" ? b.notes.trim() : "";

  return {
    received_on: b.received_on,
    label: label.slice(0, 80),
    amount: parseAmount(b.amount, "Amount"),
    notes: notes === "" ? null : notes.slice(0, 500),
  };
}

/* ------------------------------------------------------------------ */
/* Trip expense links                                                  */
/* ------------------------------------------------------------------ */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseTripLinkInput(body: unknown): TripExpenseLinkInput {
  const b = asObject(body);

  if (typeof b.trip_id !== "string" || !UUID.test(b.trip_id)) {
    throw new ValidationError("Pick a trip.");
  }
  if (typeof b.transaction_id !== "string" || !UUID.test(b.transaction_id)) {
    throw new ValidationError("Pick an expense.");
  }
  if (!TRIP_CATEGORIES.includes(b.trip_category as TripCategory)) {
    throw new ValidationError("Pick what this was spent on.");
  }

  return {
    trip_id: b.trip_id,
    transaction_id: b.transaction_id,
    trip_category: b.trip_category as TripCategory,
  };
}
