"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Expense, SettlementStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { formatDateMedium } from "@/lib/billing-cycle";
import CategoryIcon from "./CategoryIcon";
import EmptyState from "./EmptyState";

type SortKey = "expense_date" | "expense_name" | "category" | "total_amount" | "my_spending";
type SortDir = "asc" | "desc";

interface Props {
  expenses: Expense[];
  readOnly?: boolean;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  onSettlementChange?: (expense: Expense, status: SettlementStatus) => void;
}

interface ColumnDef {
  key: SortKey | null;
  label: string;
  align: "left" | "right" | "center";
  className: string;
}

/* The category is already conveyed by the coloured icon in the Expense cell,
   so its own column is dropped below `lg` to leave the expense name room to
   breathe rather than truncating it. */
const CATEGORY_COL = "hidden w-[124px] lg:table-cell";

const COLUMNS: ColumnDef[] = [
  { key: "expense_name", label: "Expense", align: "left", className: "w-auto" },
  { key: "category", label: "Category", align: "left", className: CATEGORY_COL },
  { key: "expense_date", label: "Date", align: "left", className: "w-[116px]" },
  { key: "total_amount", label: "Total", align: "right", className: "w-[100px]" },
  { key: "my_spending", label: "Your Share", align: "right", className: "w-[112px]" },
  { key: null, label: "Settlement", align: "right", className: "w-[118px]" },
];

/** Sort options offered on mobile, where there is no table header to click. */
const MOBILE_SORT_OPTIONS: { key: SortKey; label: string }[] = [
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
        <>+ {formatCurrency(expense.others_amount)}</>
      )}
    </button>
  );
}

function RowActions({
  expense,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <button
        onClick={() => onEdit?.(expense)}
        aria-label={`Edit ${expense.expense_name}`}
        title="Edit"
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors duration-150 hover:bg-primary-tint hover:text-primary"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        onClick={() => onDelete?.(expense)}
        aria-label={`Delete ${expense.expense_name}`}
        title="Delete"
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors duration-150 hover:bg-danger-bg hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

export default function ExpenseTable({ expenses, readOnly, onEdit, onDelete, onSettlementChange }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("expense_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  const totals = useMemo(
    () =>
      expenses.reduce(
        (acc, e) => ({
          total: acc.total + Number(e.total_amount),
          mine: acc.mine + Number(e.my_spending),
          outstanding:
            acc.outstanding +
            (e.settlement_status === "not_settled" ? Number(e.others_amount) : 0),
        }),
        { total: 0, mine: 0, outstanding: 0 }
      ),
    [expenses]
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Text columns read best A→Z; amounts and dates read best largest/newest first.
      setSortDir(key === "expense_name" || key === "category" ? "asc" : "desc");
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
      {/* Mobile-only sort control — the desktop table sorts from its headers. */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs md:hidden">
        <span className="mr-1 text-text-tertiary">Sort by:</span>
        {MOBILE_SORT_OPTIONS.map((opt) => {
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

      {/* ---------- Desktop: real table with column headers ---------- */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-card md:block">
        <div className="overflow-x-auto">
          {/* table-fixed keeps the declared column widths from growing to fit a
              long expense name — the name column truncates instead. */}
          <table className="w-full min-w-[680px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover/60">
                {COLUMNS.map((col) => {
                  const active = col.key !== null && sortKey === col.key;
                  return (
                    <th
                      key={col.label}
                      scope="col"
                      aria-sort={
                        active ? (sortDir === "asc" ? "ascending" : "descending") : undefined
                      }
                      className={clsx(
                        "whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary",
                        col.className,
                        col.align === "right" && "text-right",
                        col.align === "left" && "text-left"
                      )}
                    >
                      {col.key ? (
                        <button
                          onClick={() => toggleSort(col.key as SortKey)}
                          /* `uppercase` is repeated here on purpose: browsers force
                             text-transform:none on form controls, so a <button>
                             does not inherit it from the <th>. */
                          className={clsx(
                            "group/sort inline-flex items-center gap-1 rounded uppercase tracking-wide transition-colors duration-150 hover:text-text-primary",
                            active && "text-primary",
                            col.align === "right" && "flex-row-reverse"
                          )}
                        >
                          {col.label}
                          {active ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="h-3 w-3" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3 w-3" aria-hidden />
                            )
                          ) : (
                            <ArrowDown
                              className="h-3 w-3 opacity-0 transition-opacity duration-150 group-hover/sort:opacity-40"
                              aria-hidden
                            />
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  );
                })}
                {!readOnly && (
                  <th scope="col" className="w-[100px] px-4 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {sorted.map((expense) => {
                const hasOthers = expense.others_amount > 0;
                const settled = expense.settlement_status === "settled";
                const canToggle = Boolean(hasOthers && !readOnly && onSettlementChange);

                return (
                  <tr
                    key={expense.id}
                    className="group border-b border-border transition-colors duration-150 last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-tint">
                          <CategoryIcon
                            category={expense.category}
                            className="h-4 w-4 text-primary"
                          />
                        </span>
                        <span className="min-w-0 truncate font-medium text-text-primary">
                          {expense.expense_name}
                        </span>
                      </div>
                    </td>

                    <td className={clsx("px-4 py-3", CATEGORY_COL)}>
                      <span className="truncate text-text-secondary">{expense.category}</span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                      {formatDateMedium(expense.expense_date)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-text-primary">
                      {formatCurrency(expense.total_amount)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-text-primary">
                      {formatCurrency(expense.my_spending)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {hasOthers ? (
                        <SettlementBadge
                          expense={expense}
                          settled={settled}
                          canToggle={canToggle}
                          onToggle={() =>
                            onSettlementChange?.(expense, settled ? "not_settled" : "settled")
                          }
                        />
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>

                    {!readOnly && (
                      <td className="px-4 py-3">
                        <RowActions expense={expense} onEdit={onEdit} onDelete={onDelete} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="border-t border-border bg-surface-hover/60">
                {/* Kept as discrete cells (rather than a colSpan) so the row stays
                    aligned when the Category column is hidden below lg. */}
                <td className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                  {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
                </td>
                <td className={clsx("px-4 py-2.5", CATEGORY_COL)} />
                <td className="px-4 py-2.5" />
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-text-primary">
                  {formatCurrency(totals.total)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-primary">
                  {formatCurrency(totals.mine)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs font-medium tabular-nums text-text-secondary">
                  {totals.outstanding > 0 ? `${formatCurrency(totals.outstanding)} pending` : "—"}
                </td>
                {!readOnly && <td className="px-4 py-2.5" />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ---------- Mobile: stacked cards ---------- */}
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card md:hidden">
        {sorted.map((expense) => {
          const hasOthers = expense.others_amount > 0;
          const settled = expense.settlement_status === "settled";
          const canToggle = Boolean(hasOthers && !readOnly && onSettlementChange);

          return (
            <li key={expense.id} className="group px-3.5 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-tint">
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

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-text-primary">
                    {formatCurrency(expense.total_amount)}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-text-tertiary">
                    {hasOthers ? `You paid ${formatCurrency(expense.my_spending)}` : "Fully yours"}
                  </p>
                </div>
              </div>

              {(hasOthers || !readOnly) && (
                <div className="mt-2 flex items-center justify-between gap-2 pl-12">
                  {hasOthers ? (
                    <SettlementBadge
                      expense={expense}
                      settled={settled}
                      canToggle={canToggle}
                      onToggle={() =>
                        onSettlementChange?.(expense, settled ? "not_settled" : "settled")
                      }
                    />
                  ) : (
                    <span />
                  )}
                  {!readOnly && (
                    <RowActions expense={expense} onEdit={onEdit} onDelete={onDelete} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
