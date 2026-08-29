"use client";

import { useMemo, useState } from "react";
import { Expense, SettlementStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { formatDateLabel } from "@/lib/billing-cycle";
import clsx from "clsx";

type SortKey = "expense_date" | "expense_name" | "category" | "total_amount" | "others_amount" | "my_spending";

interface Props {
  expenses: Expense[];
  readOnly?: boolean;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  onSettlementChange?: (expense: Expense, status: SettlementStatus) => void;
}

const columns: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "expense_date", label: "Date" },
  { key: "expense_name", label: "Expense" },
  { key: "category", label: "Category" },
  { key: "total_amount", label: "Total Amount", align: "right" },
  { key: "others_amount", label: "Others Pay", align: "right" },
  { key: "my_spending", label: "My Spending", align: "right" },
];

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
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
        No expenses recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={clsx(
                  "cursor-pointer select-none whitespace-nowrap px-4 py-3 hover:text-slate-800",
                  col.align === "right" && "text-right"
                )}
              >
                {col.label}
                {sortKey === col.key && (sortDir === "asc" ? " ▲" : " ▼")}
              </th>
            ))}
            <th className="whitespace-nowrap px-4 py-3">Settlement</th>
            {!readOnly && <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((expense) => (
            <tr key={expense.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatDateLabel(expense.expense_date)}
              </td>
              <td className="px-4 py-3 font-medium text-slate-900">{expense.expense_name}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {expense.category}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                {formatCurrency(expense.total_amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                {expense.others_amount > 0 ? formatCurrency(expense.others_amount) : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                {formatCurrency(expense.my_spending)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {expense.others_amount > 0 ? (
                  readOnly || !onSettlementChange ? (
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        expense.settlement_status === "settled"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      )}
                    >
                      {expense.settlement_status === "settled" ? "Settled" : "Not Settled"}
                    </span>
                  ) : (
                    <select
                      value={expense.settlement_status}
                      onChange={(e) =>
                        onSettlementChange(expense, e.target.value as SettlementStatus)
                      }
                      className={clsx(
                        "rounded-full border-0 px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500",
                        expense.settlement_status === "settled"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      )}
                    >
                      <option value="not_settled">Not Settled</option>
                      <option value="settled">Settled</option>
                    </select>
                  )
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              {!readOnly && (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit?.(expense)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete?.(expense)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
