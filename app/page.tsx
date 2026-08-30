"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import ProgressBar from "@/components/glass/ProgressBar";
import EmptyState from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/Skeleton";
import CategoryBreakdown from "@/components/tracker/CategoryBreakdown";
import CategoryDonut from "@/components/tracker/CategoryDonut";
import TransactionRow from "@/components/tracker/TransactionRow";
import { useAddExpense } from "@/components/tracker/AddExpenseProvider";
import { useSession } from "@/components/tracker/SessionProvider";
import { useTracker } from "@/components/tracker/TrackerProvider";
import { budgetTone, splitBudgets, filterByMonth, summarise } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import { currentMonthKey, formatMonthKey } from "@/lib/month";
import { Category } from "@/lib/types";

/** "Good morning" until noon, "Good afternoon" until 5, "Good evening" after. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const RECENT_COUNT = 6;

export default function DashboardPage() {
  const router = useRouter();
  const { transactions, budgets, loading, error } = useTracker();
  const { open } = useAddExpense();
  const user = useSession();

  const monthKey = currentMonthKey();

  const { summary, monthTransactions, monthlyBudget } = useMemo(() => {
    const monthTransactions = filterByMonth(transactions, monthKey);
    return {
      monthTransactions,
      summary: summarise(monthTransactions),
      monthlyBudget: splitBudgets(budgets).overall,
    };
  }, [transactions, budgets, monthKey]);

  function openCategory(category: Category) {
    router.push(`/expenses?month=${monthKey}&category=${encodeURIComponent(category)}`);
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <GlassCard className="text-center">
        <p className="text-sm font-medium text-danger">{error}</p>
        <p className="mt-1 text-sm text-text-secondary">
          Check that your Supabase environment variables are set, then reload.
        </p>
      </GlassCard>
    );
  }

  const used = monthlyBudget > 0 ? (summary.total / monthlyBudget) * 100 : 0;
  const remaining = monthlyBudget - summary.total;
  const tone = budgetTone(used);

  return (
    <div className="animate-rise-in space-y-5 sm:space-y-6">
      {/* ---------------------------------------------------------- Greeting */}
      <header className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            {greeting()}
            {user ? `, ${user.username}` : ""} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{formatMonthKey(monthKey)}</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={() => open()}
          className="hidden shrink-0 sm:inline-flex lg:hidden"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Expense
        </GlassButton>
      </header>

      {/* ------------------------------------------------------- Hero figure */}
      <GlassCard weight="strong" glow className="overflow-hidden">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
          Total spent this month
        </p>
        <p className="tnum mt-2 text-[40px] font-semibold leading-none tracking-tight text-text-primary sm:text-[52px]">
          {formatCurrency(summary.total)}
        </p>

        <p className="mt-2.5 text-sm text-text-secondary">
          {summary.count === 0
            ? "No transactions yet"
            : `${summary.count} ${summary.count === 1 ? "transaction" : "transactions"}`}
          {monthlyBudget > 0 && (
            <>
              {" · "}
              <span className="tnum">{used.toFixed(0)}%</span> of{" "}
              <span className="tnum">{formatCurrency(monthlyBudget)}</span> budget
            </>
          )}
        </p>

        {monthlyBudget > 0 ? (
          <>
            <ProgressBar value={used} tone={tone} className="mt-5" label="Monthly budget used" />
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <span
                className={
                  remaining < 0
                    ? "tnum text-sm font-semibold text-danger"
                    : "tnum text-sm font-semibold text-text-primary"
                }
              >
                {remaining < 0
                  ? `${formatCurrency(Math.abs(remaining))} over budget`
                  : `${formatCurrency(remaining)} remaining`}
              </span>
              <Link
                href="/budget"
                className="text-xs font-medium text-primary transition-opacity hover:opacity-75"
              >
                Adjust budget
              </Link>
            </div>
          </>
        ) : (
          <Link
            href="/budget"
            className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-glass bg-white/40 px-4 py-3 text-sm transition-colors hover:bg-white/60 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
          >
            <span className="text-text-secondary">
              Set a monthly budget to track how much is left.
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          </Link>
        )}
      </GlassCard>

      {monthTransactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nothing recorded this month"
          description="Add your first expense and this page fills in — totals, chart and all."
          action={
            <GlassButton variant="primary" onClick={() => open()}>
              <Plus className="h-4 w-4" aria-hidden />
              Add Expense
            </GlassButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          {/* -------------------------------------------------------- Donut */}
          {/* Column layout with the ring on `flex-1`: the two cards in this
              grid stretch to match heights, and without it the ring sat at
              its fixed height with dead space underneath. */}
          <GlassCard className="flex flex-col">
            <h2 className="text-base font-semibold tracking-tight text-text-primary">
              Spending by Category
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Tap a slice to see those transactions
            </p>
            <CategoryDonut
              data={summary.byCategory}
              total={summary.total}
              onSelect={openCategory}
              centerLabel={formatMonthKey(monthKey)}
              className="mt-2 min-h-[230px] flex-1"
            />
          </GlassCard>

          {/* ------------------------------------------------ Category list */}
          <GlassCard className="flex flex-col">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight text-text-primary">
                Category Spending
              </h2>
              {summary.byCategory.length > 6 && (
                <Link
                  href={`/statistics?month=${monthKey}`}
                  className="text-xs font-medium text-primary transition-opacity hover:opacity-75"
                >
                  See all
                </Link>
              )}
            </div>
            <CategoryBreakdown data={summary.byCategory} limit={6} onSelect={openCategory} />
          </GlassCard>
        </div>
      )}

      {/* --------------------------------------------- Recent transactions */}
      {monthTransactions.length > 0 && (
        <GlassCard padded={false} className="px-1.5 py-4 sm:px-2.5 sm:py-5">
          <div className="mb-1 flex items-baseline justify-between gap-3 px-3 sm:px-4">
            <h2 className="text-base font-semibold tracking-tight text-text-primary">
              Recent Transactions
            </h2>
            <Link
              href="/expenses"
              className="text-xs font-medium text-primary transition-opacity hover:opacity-75"
            >
              View all
            </Link>
          </div>
          {monthTransactions.slice(0, RECENT_COUNT).map((t) => (
            <TransactionRow key={`${t.account}-${t.id}`} transaction={t} readOnly />
          ))}
        </GlassCard>
      )}
    </div>
  );
}
