import { CATEGORIES, Category, ExpenseInput } from "./types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseExpenseInput(body: unknown): ExpenseInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be an object.");
  }
  const b = body as Record<string, unknown>;

  const expense_name = typeof b.expense_name === "string" ? b.expense_name.trim() : "";
  if (!expense_name) {
    throw new ValidationError("Expense name is required.");
  }

  if (!CATEGORIES.includes(b.category as Category)) {
    throw new ValidationError("Category must be one of the predefined options.");
  }
  const category = b.category as Category;

  const total_amount = Number(b.total_amount);
  if (!Number.isFinite(total_amount) || total_amount < 0) {
    throw new ValidationError("Total amount must be a number greater than or equal to 0.");
  }

  const others_amount = b.others_amount === undefined || b.others_amount === null || b.others_amount === ""
    ? 0
    : Number(b.others_amount);
  if (!Number.isFinite(others_amount) || others_amount < 0) {
    throw new ValidationError("Amount to be paid by others must be a number greater than or equal to 0.");
  }

  if (others_amount > total_amount) {
    throw new ValidationError("Amount to be paid by others cannot be greater than the total amount.");
  }

  const expense_date = isValidDateString(b.expense_date)
    ? (b.expense_date as string)
    : "";
  if (!expense_date) {
    throw new ValidationError("Expense date is required and must be a valid date (YYYY-MM-DD).");
  }

  return {
    expense_name,
    category,
    total_amount: round2(total_amount),
    others_amount: round2(others_amount),
    expense_date,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
