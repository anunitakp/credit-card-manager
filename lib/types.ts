export const CATEGORIES = [
  "Food",
  "Groceries",
  "Household",
  "Dressing",
  "Beauty",
  "Transport",
  "Culture",
  "Therapy",
  "Gift",
  "Miscellaneous",
  "Electronics",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type SettlementStatus = "not_settled" | "settled";

export type CycleStatus = "open" | "closed";

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
  created_at: string;
  updated_at: string;
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
