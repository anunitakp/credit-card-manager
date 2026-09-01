"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Flame,
  Gauge,
  Hash,
  Receipt,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import GlassCard from "@/components/glass/GlassCard";
import GlassDropdown from "@/components/glass/GlassDropdown";
import MonthPicker from "@/components/glass/MonthPicker";
import SegmentedControl from "@/components/glass/SegmentedControl";
import { DashboardSkeleton } from "@/components/Skeleton";
import CategoryBreakdown from "@/components/tracker/CategoryBreakdown";
import CategoryDonut from "@/components/tracker/CategoryDonut";
import MonthlyBarChart from "@/components/tracker/MonthlyBarChart";
import PageHeader from "@/components/tracker/PageHeader";
import StatCard from "@/components/tracker/StatCard";
import TransactionRow from "@/components/tracker/TransactionRow";
import { useTracker } from "@/components/tracker/TrackerProvider";
import {
  averageDaily,
  everydayOnly,
  excludedTotal,
  filterByMonth,
  filterByYear,
  monthlyTotalsForYear,
  summarise,
  yearsWithData,
} from "@/lib/analytics";
import { formatCurrency, formatCurrencyCompact, formatCurrencyWhole } from "@/lib/format";
import { currentMonthKey, currentYear, formatMonthKey, shiftMonthKey } from "@/lib/month";
import { Category } from "@/lib/types";

type Tab = "monthly" | "yearly";

const DRILLDOWN_LIMIT = 12;

function StatisticsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Statistics are derived from expenses only — budgets live on their own
  // page and deliberately do not colour the numbers here.
  const { transactions, loading } = useTracker();

  const [tab, setTab] = useState<Tab>("monthly");
  const [month, setMonth] = useState(() => searchParams.get("month") ?? currentMonthKey());
  const [year, setYear] = useState(() => currentYear());

  const years = useMemo(() => yearsWithData(transactions, currentYear()), [transactions]);

  /* ------------------------------------------------------------ Monthly */

  const monthTransactions = useMemo(
    () => filterByMonth(transactions, month),
    [transactions, month]
  );

  /** Trip spending is held apart everywhere, so the pages cannot disagree. */
  const everyday = useMemo(() => everydayOnly(transactions), [transactions]);
  const monthExcluded = useMemo(() => excludedTotal(monthTransactions), [monthTransactions]);
  const monthSummary = useMemo(
    () => summarise(everydayOnly(monthTransactions)),
    [monthTransactions]
  );

  const monthYear = Number(month.slice(0, 4));

  /**
   * The same month a year-to-date figure cannot give you: how this month
   * compares with the one before it. Null when there is nothing to compare
   * against, so the card can say so instead of showing a meaningless 0%.
   */
  const previousMonth = shiftMonthKey(month, -1);
  const previousTotal = useMemo(
    () => summarise(everydayOnly(filterByMonth(transactions, previousMonth))).total,
    [transactions, previousMonth]
  );
  const monthOverMonth =
    previousTotal > 0 ? ((monthSummary.total - previousTotal) / previousTotal) * 100 : null;
  const monthSeries = useMemo(
    () => monthlyTotalsForYear(everyday, monthYear),
    [everyday, monthYear]
  );

  /* ------------------------------------------------------------- Yearly */

  const yearTransactions = useMemo(() => filterByYear(everyday, year), [everyday, year]);
  const yearExcluded = useMemo(
    () => excludedTotal(filterByYear(transactions, year)),
    [transactions, year]
  );
  const yearSummary = useMemo(() => summarise(yearTransactions), [yearTransactions]);
  const yearSeries = useMemo(() => monthlyTotalsForYear(everyday, year), [everyday, year]);

  const yearExtremes = useMemo(() => {
    const active = yearSeries.filter((m) => m.total > 0);
    if (active.length === 0) return null;
    const highest = active.reduce((a, b) => (b.total > a.total ? b : a));
    const lowest = active.reduce((a, b) => (b.total < a.total ? b : a));
    const average = active.reduce((sum, m) => sum + m.total, 0) / active.length;
    return { highest, lowest, average, activeMonths: active.length };
  }, [yearSeries]);

  function openCategory(category: Category, scope: "month" | "year") {
    const query =
      scope === "month"
        ? `month=${month}&category=${encodeURIComponent(category)}`
        : `category=${encodeURIComponent(category)}`;
    router.push(`/expenses?${query}`);
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Statistics"
        eyebrow={tab === "monthly" ? formatMonthKey(month) : String(year)}
        actions={
          <>
            <SegmentedControl<Tab>
              ariaLabel="Statistics period"
              value={tab}
              onChange={setTab}
              segments={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
            {tab === "monthly" ? (
              <MonthPicker value={month} onChange={setMonth} />
            ) : (
              <GlassDropdown
                value={String(year)}
                onChange={(v) => setYear(Number(v))}
                allValue="__none__"
                placeholder={String(year)}
                icon={<CalendarDays />}
                align="right"
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
                className="w-[128px]"
              />
            )}
          </>
        }
      />

      {tab === "monthly" ? (
        <div className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Total spent"
              value={formatCurrency(monthSummary.total)}
              hint={
                monthExcluded > 0
                  ? `Excludes ${formatCurrency(monthExcluded)} of trips`
                  : formatMonthKey(month)
              }
              icon={Wallet}
              tone="primary"
            />
            <StatCard
              label="Average / day"
              value={formatCurrencyWhole(averageDaily(monthSummary.total, month))}
              hint="Across days elapsed"
              icon={Gauge}
            />
            <StatCard
              label="Transactions"
              value={String(monthSummary.count)}
              hint={
                monthSummary.count > 0
                  ? `Avg ${formatCurrencyWhole(monthSummary.total / monthSummary.count)}`
                  : "Nothing recorded"
              }
              icon={Hash}
            />
            <StatCard
              label="UPI"
              value={formatCurrency(monthSummary.upiTotal)}
              hint={
                monthSummary.total > 0
                  ? `${Math.round((monthSummary.upiTotal / monthSummary.total) * 100)}% of spending`
                  : undefined
              }
              icon={Smartphone}
            />
            <StatCard
              label="Credit Card"
              value={formatCurrency(monthSummary.cardTotal)}
              hint={
                monthSummary.total > 0
                  ? `${Math.round((monthSummary.cardTotal / monthSummary.total) * 100)}% of spending`
                  : undefined
              }
              icon={CreditCard}
            />
            <StatCard
              label="Top category"
              value={monthSummary.byCategory[0]?.category ?? "—"}
              hint={
                monthSummary.byCategory[0]
                  ? formatCurrency(monthSummary.byCategory[0].amount)
                  : undefined
              }
              icon={Flame}
            />
            <StatCard
              label="Highest expense"
              value={
                monthSummary.largest ? formatCurrency(monthSummary.largest.amount) : "—"
              }
              hint={monthSummary.largest?.description}
              icon={Receipt}
            />
            <StatCard
              label="vs last month"
              value={
                monthOverMonth === null
                  ? "—"
                  : `${monthOverMonth >= 0 ? "+" : "−"}${Math.abs(monthOverMonth).toFixed(0)}%`
              }
              hint={
                previousTotal > 0
                  ? `${formatMonthKey(previousMonth)}: ${formatCurrencyWhole(previousTotal)}`
                  : "Nothing spent that month"
              }
              icon={monthOverMonth !== null && monthOverMonth > 0 ? TrendingUp : TrendingDown}
              tone={monthOverMonth !== null && monthOverMonth > 0 ? "warning" : "primary"}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            <GlassCard>
              <h2 className="text-base font-semibold tracking-tight text-text-primary">
                {monthYear} by Month
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                Tap a bar to jump to that month
              </p>
              <MonthlyBarChart
                data={monthSeries}
                activeMonth={month}
                onSelect={setMonth}
              />
            </GlassCard>

            <GlassCard>
              <h2 className="text-base font-semibold tracking-tight text-text-primary">
                Spending by Category
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">{formatMonthKey(month)}</p>
              <CategoryDonut
                data={monthSummary.byCategory}
                total={monthSummary.total}
                onSelect={(c) => openCategory(c, "month")}
                centerLabel={formatMonthKey(month)}
              />
            </GlassCard>
          </div>

          {/* ------------------------------------------------- Drill-down */}
          <GlassCard padded={false} className="px-1.5 py-4 sm:px-2.5 sm:py-5">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 sm:px-4">
              <h2 className="text-base font-semibold tracking-tight text-text-primary">
                {formatMonthKey(month)} Transactions
              </h2>
              <Link
                href={`/expenses?month=${month}`}
                className="flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-75"
              >
                Open in Expenses
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
            <p className="mb-2 px-3 text-xs text-text-tertiary sm:px-4">
              {monthSummary.count} transactions · {formatCurrency(monthSummary.total)}
            </p>

            {monthTransactions.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-tertiary">
                Nothing recorded in {formatMonthKey(month)}.
              </p>
            ) : (
              <>
                {monthTransactions.slice(0, DRILLDOWN_LIMIT).map((t) => (
                  <TransactionRow key={`${t.account}-${t.id}`} transaction={t} readOnly />
                ))}
                {monthTransactions.length > DRILLDOWN_LIMIT && (
                  <Link
                    href={`/expenses?month=${month}`}
                    className="mx-3 mt-2 flex items-center justify-center rounded-xl py-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/[0.07] sm:mx-4"
                  >
                    Show all {monthTransactions.length} transactions
                  </Link>
                )}
              </>
            )}
          </GlassCard>
        </div>
      ) : (
        /* ---------------------------------------------------------- Yearly */
        <div className="space-y-5 sm:space-y-6">
          <GlassCard weight="strong" glow>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
              Annual spending
            </p>
            <p className="tnum mt-2 text-[40px] font-semibold leading-none tracking-tight text-text-primary sm:text-[48px]">
              {formatCurrency(yearSummary.total)}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {yearSummary.count} transactions across {year}
              {yearExtremes && ` · ${yearExtremes.activeMonths} active months`}
            </p>
            {yearExcluded > 0 && (
              <p className="mt-1.5 text-xs text-text-tertiary">
                Excludes {formatCurrency(yearExcluded)} of trip spending.
              </p>
            )}
          </GlassCard>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Highest month"
              value={
                yearExtremes ? formatMonthKey(yearExtremes.highest.monthKey).split(" ")[0] : "—"
              }
              hint={yearExtremes ? formatCurrency(yearExtremes.highest.total) : undefined}
              icon={TrendingUp}
              tone="warning"
            />
            <StatCard
              label="Lowest month"
              value={
                yearExtremes ? formatMonthKey(yearExtremes.lowest.monthKey).split(" ")[0] : "—"
              }
              hint={yearExtremes ? formatCurrency(yearExtremes.lowest.total) : undefined}
              icon={TrendingDown}
              tone="primary"
            />
            <StatCard
              label="Average / month"
              value={yearExtremes ? formatCurrencyWhole(yearExtremes.average) : "—"}
              hint="Across months with spending"
              icon={Gauge}
            />
            <StatCard
              label="Transactions"
              value={String(yearSummary.count)}
              hint={
                yearSummary.count > 0
                  ? `Avg ${formatCurrencyWhole(yearSummary.total / yearSummary.count)}`
                  : undefined
              }
              icon={Hash}
            />
            <StatCard
              label="UPI total"
              value={formatCurrency(yearSummary.upiTotal)}
              hint={
                yearSummary.total > 0
                  ? `${Math.round((yearSummary.upiTotal / yearSummary.total) * 100)}% of the year`
                  : undefined
              }
              icon={Smartphone}
            />
            <StatCard
              label="Credit Card total"
              value={formatCurrency(yearSummary.cardTotal)}
              hint={
                yearSummary.total > 0
                  ? `${Math.round((yearSummary.cardTotal / yearSummary.total) * 100)}% of the year`
                  : undefined
              }
              icon={CreditCard}
            />
            <StatCard
              label="Top category"
              value={yearSummary.byCategory[0]?.category ?? "—"}
              hint={
                yearSummary.byCategory[0]
                  ? formatCurrency(yearSummary.byCategory[0].amount)
                  : undefined
              }
              icon={Flame}
            />
            <StatCard
              label="Highest expense"
              value={yearSummary.largest ? formatCurrency(yearSummary.largest.amount) : "—"}
              hint={yearSummary.largest?.description}
              icon={Receipt}
            />
          </div>

          <GlassCard>
            <h2 className="text-base font-semibold tracking-tight text-text-primary">
              Monthly Spending
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Tap a bar to open that month in the Monthly tab
            </p>
            <MonthlyBarChart
              data={yearSeries}
              onSelect={(monthKey) => {
                setMonth(monthKey);
                setTab("monthly");
              }}
            />
          </GlassCard>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            <GlassCard>
              <h2 className="text-base font-semibold tracking-tight text-text-primary">
                Category Analysis
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                Where {formatCurrencyCompact(yearSummary.total)} went in {year}
              </p>
              <CategoryDonut
                data={yearSummary.byCategory}
                total={yearSummary.total}
                onSelect={(c) => openCategory(c, "year")}
                centerLabel={String(year)}
              />
            </GlassCard>

            <GlassCard>
              <h2 className="mb-3 text-base font-semibold tracking-tight text-text-primary">
                Category Totals
              </h2>
              <CategoryBreakdown
                data={yearSummary.byCategory}
                onSelect={(c) => openCategory(c, "year")}
              />
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatisticsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StatisticsPageInner />
    </Suspense>
  );
}
