"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Plus, Receipt, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import GlassDropdown from "@/components/glass/GlassDropdown";
import GlassInput from "@/components/glass/GlassInput";
import MonthPicker from "@/components/glass/MonthPicker";
import EmptyState from "@/components/EmptyState";
import { ExpenseListSkeleton } from "@/components/Skeleton";
import PageHeader from "@/components/tracker/PageHeader";
import TransactionRow from "@/components/tracker/TransactionRow";
import { useAddExpense } from "@/components/tracker/AddExpenseProvider";
import { useTracker } from "@/components/tracker/TrackerProvider";
import { categoryColor } from "@/lib/category-meta";
import { useIsDark } from "@/components/tracker/useIsDark";
import { formatCurrency } from "@/lib/format";
import { currentMonthKey, formatMonthKey, monthKeyOf } from "@/lib/month";
import { ACCOUNTS, CATEGORIES, Transaction } from "@/lib/types";

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Highest amount" },
  { value: "amount-asc", label: "Lowest amount" },
];

const ALL = "";

function sortTransactions(list: Transaction[], sort: SortKey): Transaction[] {
  const sorted = [...list];
  switch (sort) {
    case "date-asc":
      return sorted.sort((a, b) => a.expense_date.localeCompare(b.expense_date));
    case "amount-desc":
      return sorted.sort((a, b) => b.amount - a.amount);
    case "amount-asc":
      return sorted.sort((a, b) => a.amount - b.amount);
    default:
      return sorted.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }
}

function ExpensesPageInner() {
  const searchParams = useSearchParams();
  const dark = useIsDark();
  const { transactions, loading, error } = useTracker();
  const { open, requestDelete } = useAddExpense();

  // The dashboard and statistics pages link in here pre-filtered, so the
  // initial state comes from the URL when it is there.
  const [month, setMonth] = useState(() => searchParams.get("month") ?? currentMonthKey());
  const [allMonths, setAllMonths] = useState(false);
  const [category, setCategory] = useState<string>(() => searchParams.get("category") ?? ALL);
  const [account, setAccount] = useState<string>(() => searchParams.get("account") ?? ALL);
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [query, setQuery] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Following a second link into this page (a different category from the
  // dashboard, say) has to move the filters, not be ignored.
  useEffect(() => {
    const monthParam = searchParams.get("month");
    const categoryParam = searchParams.get("category");
    const accountParam = searchParams.get("account");
    if (monthParam) {
      setMonth(monthParam);
      setAllMonths(false);
    }
    if (categoryParam) setCategory(categoryParam);
    if (accountParam) setAccount(accountParam);
  }, [searchParams]);


  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const min = minAmount === "" ? null : Number(minAmount);
    const max = maxAmount === "" ? null : Number(maxAmount);

    const result = transactions.filter((t) => {
      if (!allMonths && monthKeyOf(t.expense_date) !== month) return false;
      if (category !== ALL && t.category !== category) return false;
      if (account !== ALL && t.account !== account) return false;
      if (min !== null && Number.isFinite(min) && t.amount < min) return false;
      if (max !== null && Number.isFinite(max) && t.amount > max) return false;
      if (needle) {
        const haystack = `${t.description} ${t.category}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    return sortTransactions(result, sort);
  }, [
    transactions,
    allMonths,
    month,
    category,
    account,
    minAmount,
    maxAmount,
    query,
    sort,
  ]);

  const total = useMemo(() => filtered.reduce((sum, t) => sum + t.amount, 0), [filtered]);

  const filtersActive =
    category !== ALL ||
    account !== ALL ||
    query.trim() !== "" ||
    minAmount !== "" ||
    maxAmount !== "";

  function resetFilters() {
    setCategory(ALL);
    setAccount(ALL);
    setQuery("");
    setMinAmount("");
    setMaxAmount("");
  }

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Expenses"
        eyebrow={allMonths ? "All time" : formatMonthKey(month)}
        subtitle={
          loading
            ? undefined
            : `${filtered.length} ${filtered.length === 1 ? "transaction" : "transactions"} · ${formatCurrency(total)}`
        }
        actions={
          <>
            {!allMonths && <MonthPicker value={month} onChange={setMonth} />}
            <GlassButton
              variant={allMonths ? "primary" : "glass"}
              onClick={() => setAllMonths((v) => !v)}
            >
              {allMonths ? "Showing all months" : "All months"}
            </GlassButton>
            <GlassButton variant="primary" onClick={() => open()} className="hidden sm:inline-flex">
              <Plus className="h-4 w-4" aria-hidden />
              Add
            </GlassButton>
          </>
        }
      />

      {/* ------------------------------------------------------- Filter bar */}
      <GlassCard padded={false} className="mb-5 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:flex-1">
            <GlassInput
              icon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by description or category"
              aria-label="Search transactions"
            />
          </div>
          <div className="flex items-center gap-2">
            <GlassDropdown
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={SORT_OPTIONS}
              placeholder="Newest first"
              allValue="date-desc"
              icon={<ArrowUpDown />}
              align="right"
              className="flex-1 sm:w-[168px] sm:flex-none"
            />
            <GlassButton
              variant={showFilters || filtersActive ? "primary" : "glass"}
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="h-9 shrink-0"
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Filters
            </GlassButton>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-glass pt-3 animate-fade-in sm:grid-cols-4">
            <GlassDropdown
              value={category}
              onChange={setCategory}
              placeholder="All categories"
              options={[
                { value: ALL, label: "All categories" },
                ...CATEGORIES.map((c) => ({
                  value: c,
                  label: c,
                  swatch: categoryColor(c, dark),
                })),
              ]}
            />
            <GlassDropdown
              value={account}
              onChange={setAccount}
              placeholder="All accounts"
              options={[
                { value: ALL, label: "All accounts" },
                ...ACCOUNTS.map((a) => ({ value: a, label: a })),
              ]}
            />
            <GlassInput
              type="number"
              min={0}
              inputMode="decimal"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="Min ₹"
              aria-label="Minimum amount"
              className="tnum h-9 text-[13px]"
            />
            <GlassInput
              type="number"
              min={0}
              inputMode="decimal"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="Max ₹"
              aria-label="Maximum amount"
              className="tnum h-9 text-[13px]"
            />
          </div>
        )}

        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-75"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Clear filters
          </button>
        )}
      </GlassCard>

      {/* ----------------------------------------------------------- Result */}
      {loading ? (
        <ExpenseListSkeleton />
      ) : error ? (
        <GlassCard className="text-center">
          <p className="text-sm font-medium text-danger">{error}</p>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filtersActive ? "Nothing matches these filters" : "No transactions here"}
          description={
            filtersActive
              ? "Try clearing a filter or widening the amount range."
              : `Nothing was recorded in ${allMonths ? "your history" : formatMonthKey(month)} yet.`
          }
          action={
            filtersActive ? (
              <GlassButton variant="glass" onClick={resetFilters}>
                Clear filters
              </GlassButton>
            ) : (
              <GlassButton variant="primary" onClick={() => open()}>
                <Plus className="h-4 w-4" aria-hidden />
                Add Expense
              </GlassButton>
            )
          }
        />
      ) : (
        <GlassCard padded={false} className="divide-y divide-[color:var(--glass-border-soft)] px-1.5 py-2 sm:px-2.5">
          {filtered.map((t) => (
            <TransactionRow
              key={`${t.account}-${t.id}`}
              transaction={t}
              showYear={allMonths}
              onEdit={open}
              onDelete={requestDelete}
            />
          ))}
        </GlassCard>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  // `useSearchParams` needs a Suspense boundary above it during prerender.
  return (
    <Suspense fallback={<ExpenseListSkeleton />}>
      <ExpensesPageInner />
    </Suspense>
  );
}
