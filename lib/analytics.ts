import { Budget, Category, Transaction } from "./types";
import { elapsedDaysInMonth, monthKeyOf, yearOf } from "./month";
import { round2 } from "./format";

/**
 * Every number the app displays is derived here, from one array of
 * transactions. Nothing is stored pre-aggregated, so a credit-card expense
 * edited in the Credit Card Manager changes the dashboard, the budget page
 * and both statistics tabs at once, with no recomputation step to forget.
 */

export interface CategoryTotal {
  category: Category;
  amount: number;
  /** Share of the period's total spending, 0–100. */
  share: number;
  count: number;
}

export interface PeriodSummary {
  total: number;
  count: number;
  upiTotal: number;
  cardTotal: number;
  byCategory: CategoryTotal[];
  /** Largest single transaction of the period, if any. */
  largest: Transaction | null;
}

export function filterByMonth(transactions: Transaction[], monthKey: string): Transaction[] {
  return transactions.filter((t) => monthKeyOf(t.expense_date) === monthKey);
}

export function filterByYear(transactions: Transaction[], year: number): Transaction[] {
  return transactions.filter((t) => yearOf(t.expense_date) === year);
}

export function summarise(transactions: Transaction[]): PeriodSummary {
  let total = 0;
  let upiTotal = 0;
  let cardTotal = 0;
  let largest: Transaction | null = null;

  const totals = new Map<Category, { amount: number; count: number }>();

  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    total += amount;
    if (t.account === "UPI") upiTotal += amount;
    else cardTotal += amount;

    if (!largest || amount > Number(largest.amount)) largest = t;

    const entry = totals.get(t.category) ?? { amount: 0, count: 0 };
    entry.amount += amount;
    entry.count += 1;
    totals.set(t.category, entry);
  }

  const byCategory: CategoryTotal[] = Array.from(totals.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount: round2(amount),
      count,
      share: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    total: round2(total),
    count: transactions.length,
    upiTotal: round2(upiTotal),
    cardTotal: round2(cardTotal),
    byCategory,
    largest,
  };
}

/** Spending per calendar month across a year, January first. Always 12 entries. */
export function monthlyTotalsForYear(
  transactions: Transaction[],
  year: number
): { monthKey: string; total: number; count: number }[] {
  const buckets = new Map<string, { total: number; count: number }>();

  for (const t of transactions) {
    if (yearOf(t.expense_date) !== year) continue;
    const key = monthKeyOf(t.expense_date);
    const entry = buckets.get(key) ?? { total: 0, count: 0 };
    entry.total += Number(t.amount) || 0;
    entry.count += 1;
    buckets.set(key, entry);
  }

  return Array.from({ length: 12 }, (_, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, "0")}`;
    const entry = buckets.get(monthKey) ?? { total: 0, count: 0 };
    return { monthKey, total: round2(entry.total), count: entry.count };
  });
}

/** Every year that has at least one transaction, newest first. */
export function yearsWithData(transactions: Transaction[], fallbackYear: number): number[] {
  const years = new Set<number>(transactions.map((t) => yearOf(t.expense_date)));
  years.add(fallbackYear);
  return Array.from(years).sort((a, b) => b - a);
}

/** Every month that has at least one transaction, newest first. */
export function monthsWithData(transactions: Transaction[], fallbackMonth: string): string[] {
  const months = new Set<string>(transactions.map((t) => monthKeyOf(t.expense_date)));
  months.add(fallbackMonth);
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */

export interface BudgetLine {
  category: Category | null; // null = the overall monthly budget
  budget: number;
  spent: number;
  /** Negative once spending has passed the budget. */
  remaining: number;
  /** Spent as a share of budget, 0–∞. */
  used: number;
  over: boolean;
}

/**
 * Splits the standing budgets into the overall figure and a per-category
 * lookup.
 *
 * Budgets are not month-specific: one set is defined and it applies to every
 * month until it is edited. That means a past month is measured against
 * today's budget rather than against whatever was set at the time — which is
 * the intended behaviour, since there is only ever one budget.
 */
export function splitBudgets(
  budgets: Budget[]
): { overall: number; byCategory: Map<Category, number> } {
  let overall = 0;
  const byCategory = new Map<Category, number>();

  for (const b of budgets) {
    if (b.category === null) overall = Number(b.amount);
    else byCategory.set(b.category, Number(b.amount));
  }

  return { overall, byCategory };
}

export function budgetLine(budget: number, spent: number, category: Category | null): BudgetLine {
  return {
    category,
    budget: round2(budget),
    spent: round2(spent),
    remaining: round2(budget - spent),
    used: budget > 0 ? (spent / budget) * 100 : 0,
    over: budget > 0 && spent > budget,
  };
}

/**
 * The tone a budget indicator should use. Amber starts at 80% because a
 * budget that is *about* to be blown is the thing worth reacting to; red is
 * reserved for one that already has been.
 */
export function budgetTone(used: number): "primary" | "warning" | "danger" {
  if (used > 100) return "danger";
  if (used >= 80) return "warning";
  return "primary";
}

/** Average spend per elapsed day of a month — not per calendar day. */
export function averageDaily(total: number, monthKey: string): number {
  const days = elapsedDaysInMonth(monthKey);
  return days > 0 ? round2(total / days) : 0;
}
