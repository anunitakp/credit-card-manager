"use client";

import { IndianRupee, PiggyBank, TrendingUp } from "lucide-react";
import GlassCard from "@/components/glass/GlassCard";
import PageHeader from "@/components/tracker/PageHeader";

/**
 * Salary — deliberately a placeholder for now.
 *
 * The page exists so the route, the navigation entry and the layout are
 * already settled; when income tracking is built, it fills in here without
 * anything else in the app having to move. The three cards below name the
 * pieces that are planned so the page says something concrete rather than
 * just "coming soon".
 */

const PLANNED = [
  {
    icon: IndianRupee,
    title: "Monthly income",
    description: "Record salary and any other income against the month it lands in.",
  },
  {
    icon: PiggyBank,
    title: "Savings rate",
    description: "What is left after the month's spending, tracked over time.",
  },
  {
    icon: TrendingUp,
    title: "Income vs spending",
    description: "The two lines on one chart, month by month.",
  },
];

export default function SalaryPage() {
  return (
    <div className="animate-rise-in">
      <PageHeader title="Salary" eyebrow="Income" />

      <GlassCard weight="strong" glow className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <IndianRupee className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-text-primary">
          Coming soon
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          Income tracking is not built yet. Your spending, budgets and statistics all work
          without it — this page is reserved so it can be added without rearranging anything.
        </p>
      </GlassCard>

      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANNED.map(({ icon: Icon, title, description }) => (
          <GlassCard as="li" key={title} weight="subtle" className="rounded-2xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-text-primary/[0.06] text-text-secondary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-text-primary">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p>
          </GlassCard>
        ))}
      </ul>
    </div>
  );
}
