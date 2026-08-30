export const CATEGORIES = [
  "Food",
  "Groceries",
  "Household",
  "Dressing",
  "Beauty",
  "Skincare",
  "Transport",
  "Culture",
  "Books & Subscription",
  "Therapy",
  "Gift",
  "Electronics",
  "Trip",
  "Miscellaneous",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const ACCOUNTS = ["UPI", "Credit Card"] as const;
export type Account = (typeof ACCOUNTS)[number];

export type SettlementStatus = "not_settled" | "settled";

export type CycleStatus = "open" | "closed";

/* ------------------------------------------------------------------ */
/* Credit Card Manager                                                 */
/* ------------------------------------------------------------------ */

export interface BillingCycle {
  id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: CycleStatus;
  created_at: string;
  closed_at: string | null;
}

export interface Expense {
  id: string;
  cycle_id: string;
  expense_name: string;
  category: Category;
  total_amount: number;
  others_amount: number;
  my_spending: number;
  settlement_status: SettlementStatus;
  expense_date: string; // YYYY-MM-DD
}

export interface ExpenseInput {
  expense_name: string;
  category: Category;
  total_amount: number;
  others_amount: number;
  expense_date: string;
}

export interface CycleSummary {
  totalSpending: number;
  mySpending: number;
  amountToGet: number;
  amountYetToGet: number;
  categoryBreakdown: { category: string; amount: number }[];
}

export interface CycleWithExpenses {
  cycle: BillingCycle;
  expenses: Expense[];
  summary: CycleSummary;
}

export interface ArchiveListItem {
  id: string;
  start_date: string;
  end_date: string;
  closed_at: string | null;
  totalSpending: number;
  mySpending: number;
}

/* ------------------------------------------------------------------ */
/* Expense Tracker                                                     */
/* ------------------------------------------------------------------ */

/**
 * A row of the `all_transactions` view — the union of credit-card expenses
 * and manually entered UPI expenses. `id` is the primary key of whichever
 * underlying table the row came from, and `account` says which table that
 * is, so an edit or delete can be routed back to the right place.
 *
 * Credit-card rows are read-only from inside the tracker; they are edited in
 * the Credit Card Manager, and any change there shows up here immediately
 * because this is the same row, not a copy of it.
 */
export interface Transaction {
  id: string;
  account: Account;
  description: string;
  category: Category;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  /** Only used to break ties when two transactions share a date. Never shown. */
  created_at: string;
  cycle_id: string | null;
}

export interface UpiExpenseInput {
  description: string;
  category: Category;
  amount: number;
  expense_date: string;
}

/**
 * One standing budget, not one per month. It is set once and applies to every
 * month until it is changed; `category` is null for the overall monthly
 * budget.
 */
export interface Budget {
  id: string;
  category: Category | null;
  amount: number;
}

export interface BudgetInput {
  category: Category | null;
  amount: number;
}

export interface Trip {
  id: string;
  trip_date: string; // YYYY-MM-DD
  place: string;
  total_amount: number;
  notes: string | null;
}

export interface TripInput {
  trip_date: string;
  place: string;
  total_amount: number;
  notes: string | null;
}

export interface Note {
  id: string;
  title: string;
  content: string;
}

export interface NoteInput {
  title: string;
  content: string;
}
