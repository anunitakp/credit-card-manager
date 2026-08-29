"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import CategoryIcon from "./CategoryIcon";
import { Category } from "@/lib/types";
import EmptyState from "./EmptyState";

const COLORS = [
  "#4053D6",
  "#22B07D",
  "#E0A62E",
  "#E0616E",
  "#8B6FE0",
  "#2FA3C4",
  "#D6668F",
  "#7FB33E",
  "#DB8A3C",
  "#3AA6A0",
  "#6675E8",
];

interface Props {
  data: { category: string; amount: number }[];
}

interface TooltipPayloadItem {
  name: string;
  value: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs shadow-modal">
      <p className="font-medium text-text-primary">{item.name}</p>
      <p className="text-text-secondary">{formatCurrency(item.value)}</p>
    </div>
  );
}

export default function CategoryChart({ data }: Props) {
  const chartData = data.filter((d) => d.amount > 0);
  const total = chartData.reduce((sum, d) => sum + d.amount, 0);

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5">
      <h2 className="text-base font-semibold text-text-primary">Spending Overview</h2>
      <p className="mt-0.5 text-sm text-text-secondary">
        Where your money went this billing cycle
      </p>

      {chartData.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={PieChartIcon}
            title="Nothing to chart yet"
            description="Add an expense and its category breakdown will show up here."
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
          <div className="relative h-52 w-52 shrink-0 sm:h-56 sm:w-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                Total
              </span>
              <span className="mt-0.5 text-xl font-semibold text-text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <ul className="w-full space-y-1 sm:w-auto sm:min-w-[240px]">
            {chartData
              .slice()
              .sort((a, b) => b.amount - a.amount)
              .map((entry) => {
                const index = chartData.findIndex((d) => d.category === entry.category);
                const pct = total > 0 ? Math.round((entry.amount / total) * 100) : 0;
                return (
                  <li
                    key={entry.category}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      aria-hidden
                    />
                    <CategoryIcon
                      category={entry.category as Category}
                      className="h-3.5 w-3.5 shrink-0 text-text-tertiary"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {entry.category}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-text-primary">
                      {formatCurrency(entry.amount)}
                    </span>
                    <span className="w-9 shrink-0 text-right text-xs text-text-tertiary">
                      {pct}%
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </section>
  );
}
