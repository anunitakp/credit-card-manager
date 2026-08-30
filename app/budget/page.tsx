"use client";

import { useMemo, useState } from "react";
import { Pencil, TrendingUp } from "lucide-react";
import clsx from "clsx";
import CategoryIcon from "@/components/CategoryIcon";
import GlassButton from "@/components/glass/GlassButton";
import GlassCard from "@/components/glass/GlassCard";
import GlassInput, { Field } from "@/components/glass/GlassInput";
import GlassModal from "@/components/glass/GlassModal";
import ProgressBar, { ProgressRing } from "@/components/glass/ProgressBar";
import { useToast } from "@/components/ToastProvider";
import PageHeader from "@/components/tracker/PageHeader";
import { useTracker } from "@/components/tracker/TrackerProvider";
import { useIsDark } from "@/components/tracker/useIsDark";
import { budgetLine, budgetTone, splitBudgets, filterByMonth, summarise } from "@/lib/analytics";
import { categoryColor } from "@/lib/category-meta";
import { formatCurrency } from "@/lib/format";
import { currentMonthKey, formatMonthKey } from "@/lib/month";
import { saveBudget } from "@/lib/tracker-client";
import { CATEGORIES, Category } from "@/lib/types";

/**
 * Budgets are set once and apply to every month.
 *
 * There is no month selector here on purpose: one standing budget, edited
 * whenever it needs to change. Spending shown alongside it is the current
 * month's, since that is the month the budget is currently being measured
 * against.
 */
export default function BudgetPage() {
  const { toast } = useToast();
  const dark = useIsDark();
  const { transactions, budgets, loading, refreshBudgets } = useTracker();

  const [overallOpen, setOverallOpen] = useState(false);
  const [overallDraft, setOverallDraft] = useState("");
  const [savingOverall, setSavingOverall] = useState(false);

  /** Per-category values while they are being typed, keyed by category. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const month = currentMonthKey();

  const { overall, byCategory } = useMemo(() => splitBudgets(budgets), [budgets]);

  const summary = useMemo(
    () => summarise(filterByMonth(transactions, month)),
    [transactions, month]
  );

  const spentByCategory = useMemo(() => {
    const map = new Map<Category, number>();
    for (const row of summary.byCategory) map.set(row.category, row.amount);
    return map;
  }, [summary]);

  const overallLine = budgetLine(overall, summary.total, null);
  const tone = budgetTone(overallLine.used);

  async function persist(category: Category | null, amount: number) {
    await saveBudget({ category, amount });
    await refreshBudgets();
  }

  async function handleSaveOverall() {
    const amount = overallDraft.trim() === "" ? 0 : Number(overallDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: "Enter a valid amount", variant: "error" });
      return;
    }
    setSavingOverall(true);
    try {
      await persist(null, amount);
      toast({
        title: amount > 0 ? "Monthly budget saved" : "Monthly budget cleared",
        description: amount > 0 ? "Applies to every month from now on." : undefined,
      });
      setOverallOpen(false);
    } catch (err) {
      toast({
        title: "Could not save the budget",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setSavingOverall(false);
    }
  }

  async function commitCategory(category: Category) {
    const draft = drafts[category];
    if (draft === undefined) return;

    const amount = draft.trim() === "" ? 0 : Number(draft);
    const previous = byCategory.get(category) ?? 0;

    setDrafts((d) => {
      const next = { ...d };
      delete next[category];
      return next;
    });

    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: "Enter a valid amount", variant: "error" });
      return;
    }
    if (amount === previous) return;

    try {
      await persist(category, amount);
    } catch (err) {
      toast({
        title: `Could not save the ${category} budget`,
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    }
  }

  // Categories with a budget or any spending come first; the rest follow so
  // a budget can still be set on them.
  const rows = useMemo(() => {
    const relevant: Category[] = [];
    const rest: Category[] = [];
    for (const c of CATEGORIES) {
      const hasBudget = (byCategory.get(c) ?? 0) > 0;
      const hasSpending = (spentByCategory.get(c) ?? 0) > 0;
      (hasBudget || hasSpending ? relevant : rest).push(c);
    }
    relevant.sort((a, b) => (spentByCategory.get(b) ?? 0) - (spentByCategory.get(a) ?? 0));
    return [...relevant, ...rest];
  }, [byCategory, spentByCategory]);

  const totalCategoryBudget = useMemo(
    () => Array.from(byCategory.values()).reduce((sum, v) => sum + v, 0),
    [byCategory]
  );

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Budget"
        eyebrow="Standing budget"
        subtitle="Set once and it applies every month. Edit it whenever it needs to change."
      />

      {/* ------------------------------------------------- Overall budget */}
      <GlassCard weight="strong" glow className="mb-5">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <ProgressRing value={overallLine.used} tone={tone}>
            <span className="tnum text-[26px] font-semibold leading-none tracking-tight text-text-primary">
              {overall > 0 ? `${Math.round(overallLine.used)}%` : "—"}
            </span>
            <span className="mt-1 text-[11px] text-text-secondary">
              {overall > 0 ? "of budget used" : "no budget set"}
            </span>
          </ProgressRing>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
              Spent in {formatMonthKey(month)}
            </p>
            <p className="tnum mt-1.5 text-[34px] font-semibold leading-none tracking-tight text-text-primary sm:text-[40px]">
              {formatCurrency(summary.total)}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md sm:grid-cols-3">
              <div className="rounded-2xl border border-glass bg-white/40 px-3.5 py-3 text-left dark:bg-white/[0.05]">
                <dt className="text-[11px] text-text-secondary">Monthly budget</dt>
                <dd className="tnum mt-1 text-sm font-semibold text-text-primary">
                  {overall > 0 ? formatCurrency(overall) : "Not set"}
                </dd>
              </div>
              <div className="rounded-2xl border border-glass bg-white/40 px-3.5 py-3 text-left dark:bg-white/[0.05]">
                <dt className="text-[11px] text-text-secondary">
                  {overallLine.remaining < 0 ? "Over by" : "Remaining"}
                </dt>
                <dd
                  className={clsx(
                    "tnum mt-1 text-sm font-semibold",
                    overallLine.remaining < 0 ? "text-danger" : "text-text-primary"
                  )}
                >
                  {overall > 0 ? formatCurrency(Math.abs(overallLine.remaining)) : "—"}
                </dd>
              </div>
              <div className="col-span-2 rounded-2xl border border-glass bg-white/40 px-3.5 py-3 text-left dark:bg-white/[0.05] sm:col-span-1">
                <dt className="text-[11px] text-text-secondary">Transactions</dt>
                <dd className="tnum mt-1 text-sm font-semibold text-text-primary">
                  {summary.count}
                </dd>
              </div>
            </dl>

            <GlassButton
              variant="primary"
              size="sm"
              className="mt-5"
              onClick={() => {
                setOverallDraft(overall > 0 ? String(overall) : "");
                setOverallOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {overall > 0 ? "Edit monthly budget" : "Set monthly budget"}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* ------------------------------------------------ Category budgets */}
      <GlassCard padded={false} className="p-4 sm:p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
          <h2 className="text-base font-semibold tracking-tight text-text-primary">
            Category Budgets
          </h2>
          {totalCategoryBudget > 0 && (
            <p className="tnum text-xs text-text-tertiary">
              {formatCurrency(totalCategoryBudget)} allocated
              {overall > 0 && totalCategoryBudget > overall && (
                <span className="text-warning"> · over your monthly budget</span>
              )}
            </p>
          )}
        </div>
        <p className="mb-3 px-1 text-xs text-text-tertiary">
          Type an amount to set a budget; clear it to remove it. Spent and remaining are for{" "}
          {formatMonthKey(month)}.
        </p>

        {/* Column headings, desktop only — on mobile each row is self-labelling. */}
        <div className="hidden items-center gap-3 border-b border-glass px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary sm:flex">
          <span className="flex-1">Category</span>
          <span className="w-28 text-right">Budget</span>
          <span className="w-24 text-right">Spent</span>
          <span className="w-28 text-right">Remaining</span>
        </div>

        <ul className="divide-y divide-[color:var(--glass-border-soft)]">
          {rows.map((category) => {
            const budget = byCategory.get(category) ?? 0;
            const spent = spentByCategory.get(category) ?? 0;
            const line = budgetLine(budget, spent, category);
            const color = categoryColor(category, dark);
            const draft = drafts[category];

            return (
              <li key={category} className="px-1 py-3 sm:px-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${color}1f`, color }}
                    aria-hidden
                  >
                    <CategoryIcon category={category} className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                    {category}
                  </span>

                  {/* The input stays on the title row at every width. Dropping
                      it onto its own full-width line below, as it used to, made
                      each row three tall bands of mostly empty space. */}
                  <div className="w-[94px] shrink-0 sm:w-28">
                    <label className="sr-only" htmlFor={`budget-${category}`}>
                      {category} budget
                    </label>
                    <GlassInput
                      id={`budget-${category}`}
                      type="number"
                      min={0}
                      step="1"
                      inputMode="decimal"
                      className="tnum h-9 text-right text-[13px]"
                      placeholder="Set ₹"
                      value={draft ?? (budget > 0 ? String(budget) : "")}
                      onChange={(e) => setDrafts((d) => ({ ...d, [category]: e.target.value }))}
                      onBlur={() => void commitCategory(category)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                  </div>

                  {/* Desktop keeps the aligned columns under their headings. */}
                  <span className="tnum hidden w-24 shrink-0 text-right text-sm text-text-secondary sm:block">
                    {formatCurrency(spent)}
                  </span>

                  <span
                    className={clsx(
                      "tnum hidden w-28 shrink-0 text-right text-sm font-semibold sm:block",
                      budget === 0
                        ? "text-text-tertiary"
                        : line.over
                          ? "text-danger"
                          : "text-text-primary"
                    )}
                  >
                    {budget === 0
                      ? "—"
                      : line.over
                        ? `−${formatCurrency(Math.abs(line.remaining))}`
                        : formatCurrency(line.remaining)}
                  </span>
                </div>

                {/* Mobile has no column headings, so the two figures carry
                    their own labels rather than sitting there unexplained. */}
                <div className="mt-2 flex items-baseline justify-between gap-3 text-xs sm:hidden">
                  <span className="text-text-secondary">
                    Spent{" "}
                    <span className="tnum font-semibold text-text-primary">
                      {formatCurrency(spent)}
                    </span>
                  </span>
                  {budget > 0 && (
                    <span className="text-text-secondary">
                      {line.over ? "Over by" : "Left"}{" "}
                      <span
                        className={clsx(
                          "tnum font-semibold",
                          line.over ? "text-danger" : "text-text-primary"
                        )}
                      >
                        {formatCurrency(Math.abs(line.remaining))}
                      </span>
                    </span>
                  )}
                </div>

                {budget > 0 && (
                  <ProgressBar
                    value={line.used}
                    tone={budgetTone(line.used)}
                    size="sm"
                    className="mt-2.5"
                    label={`${category} budget used`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </GlassCard>

      {loading && (
        <p className="mt-4 text-center text-sm text-text-tertiary">Loading your budgets…</p>
      )}

      {/* --------------------------------------------- Overall budget modal */}
      <GlassModal
        open={overallOpen}
        onClose={() => setOverallOpen(false)}
        title="Monthly Budget"
        subtitle="Applies to every month until you change it."
        size="sm"
        footer={
          <div className="flex gap-3">
            <GlassButton variant="glass" block onClick={() => setOverallOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              block
              disabled={savingOverall}
              onClick={() => void handleSaveOverall()}
            >
              {savingOverall ? "Saving…" : "Save"}
            </GlassButton>
          </div>
        }
      >
        <Field
          label="Budget per month"
          hint="Leave empty to remove the budget."
          htmlFor="overall-budget"
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-tertiary">
              ₹
            </span>
            <input
              id="overall-budget"
              type="number"
              min={0}
              step="1"
              inputMode="decimal"
              value={overallDraft}
              onChange={(e) => setOverallDraft(e.target.value)}
              placeholder="60000"
              className="tnum h-16 w-full rounded-2xl border border-glass bg-white/45 pl-10 pr-4 text-3xl font-semibold tracking-tight text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary/50 focus:border-primary/60 focus:bg-white/70 focus:ring-4 focus:ring-primary/10 dark:bg-white/[0.05] dark:focus:bg-white/[0.09]"
            />
          </div>
        </Field>

        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-glass bg-white/40 px-3.5 py-3 dark:bg-white/[0.05]">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-text-secondary">
            You have spent{" "}
            <span className="tnum font-semibold text-text-primary">
              {formatCurrency(summary.total)}
            </span>{" "}
            in {formatMonthKey(month)} so far.
          </p>
        </div>
      </GlassModal>
    </div>
  );
}
