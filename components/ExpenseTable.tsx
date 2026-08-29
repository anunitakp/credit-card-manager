"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Expense, SettlementStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { formatDateMedium } from "@/lib/billing-cycle";
import CategoryIcon from "./CategoryIcon";
import EmptyState from "./EmptyState";

type SortKey = "expense_date" | "expense_name" | "category" | "total_amount" | "my_spending";

interface Props {
  expenses: Expense[];
  readOnly?: boolean;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  onSettlementChange?: (expense: Expense, status: SettlementStatus) => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "expense_date", label: "Date" },
  { key: "total_amount", label: "Amount" },
  { key: "category", label: "Category" },
  { key: "expense_name", label: "Name" },
];

function SettlementBadge({
  expense,
  settled,
  canToggle,
  onToggle,
}: {
  expense: Expense;
  settled: boolean;
  canToggle: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!canToggle}
      onClick={() => canToggle && onToggle()}
      title={canToggle ? `Mark as ${settled ? "not settled" : "settled"}` : undefined}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors duration-150",
        settled ? "bg-success-bg text-success" : "bg-warning-bg text-warning",
        canToggle ? "cursor-pointer hover:brightness-95" : "cursor-default"
      )}
    >
      {settled ? (
        <>
          <Check className="h-3 w-3" aria-hidden />
          Settled
        </>
      ) : (
        <>+ {formatCurrency(expense.others_amount)} to get</>
      )}
    </button>
  );
}

export default function ExpenseTable({ expenses, readOnly, onEdit, onDelete, onSettlementChange }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("expense_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...expenses];
    copy.sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [expenses, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Start tracking your spending for this billing cycle."
      />
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 text-text-tertiary">Sort by:</span>
        {SORT_OPTIONS.map((opt) => {
          const active = sortKey === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => toggleSort(opt.key)}
              className={clsx(
                "rounded-full border px-2.5 py-1 font-medium transition-colors duration-150",
                active
                  ? "border-primary/30 bg-primary-tint text-primary"
                  : "border-border text-text-secondary hover:bg-surface-hover"
              )}
            >
              {opt.label}
              {active && (sortDir === "asc" ? " ↑" : " ↓")}
            </button>
          );
        })}
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {sorted.map((expense) => {
          const hasOthers = expense.others_amount > 0;
          const settled = expense.settlement_status === "settled";
          const canToggleSettlement = Boolean(hasOthers && !readOnly && onSettlementChange);
          const toggle = () => onSettlementChange?.(expense, settled ? "not_settled" : "settled");

          return (
            <li
              key={expense.id}
              className="group flex items-center gap-3 px-3.5 py-3.5 transition-colors duration-150 hover:bg-surface-hover sm:gap-5 sm:px-5 sm:py-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-tint">
                <CategoryIcon category={expense.category} className="h-4 w-4 text-primary" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {expense.expense_name}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">
                  {expense.category} · {formatDateMedium(expense.expense_date)}
                </p>
              </div>

              {/* Compact stacked summary — mobile only */}
              <div className="flex shrink-0 flex-col items-end gap-1 sm:hidden">
                <span className="text-sm font-semibold text-text-primary">
                  {formatCurrency(expense.total_amount)}
                </span>
                {hasOthers ? (
                  <span className="text-xs text-text-tertiary">
                    You paid {formatCurrency(expense.my_spending)}
                  </span>
                ) : (
                  <span className="text-xs text-text-tertiary">Fully yours</span>
                )}
              </div>
              {hasOthers && (
                <div className="sm:hidden">
                  <SettlementBadge
                    expense={expense}
                    settled={settled}
                    canToggle={canToggleSettlement}
                    onToggle={toggle}
                  />
                </div>
              )}

              {/* Relaxed columns — sm and up */}
              <div className="hidden shrink-0 items-center gap-6 sm:flex lg:gap-10">
                <div className="w-20 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                    Total
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-text-primary">
                    {formatCurrency(expense.total_amount)}
                  </p>
                </div>
                <div className="w-20 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                    Your Share
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-text-primary">
                    {formatCurrency(expense.my_spending)}
                  </p>
                </div>
                <div className="w-28">
                  <p className="text-right text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                    Settlement
                  </p>
                  <div className="mt-1 flex justify-end">
                    {hasOthers ? (
                      <SettlementBadge
                        expense={expense}
                        settled={settled}
                        canToggle={canToggleSettlement}
                        onToggle={toggle}
                      />
                    ) : (
                      <span className="text-sm text-text-tertiary">—</span>
                    )}
                  </div>
                </div>
              </div>

              {!readOnly && (
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    onClick={() => onEdit?.(expense)}
                    aria-label={`Edit ${expense.expense_name}`}
                    title="Edit"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    onClick={() => onDelete?.(expense)}
                    aria-label={`Delete ${expense.expense_name}`}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-danger-bg hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
