"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatCurrencyCompact } from "@/lib/format";
import { MONTH_ABBR } from "@/lib/month";
import { useIsDark } from "./useIsDark";

interface Props {
  data: { monthKey: string; total: number; count: number }[];
  /** Highlighted month, e.g. the one currently selected. */
  activeMonth?: string;
  onSelect?: (monthKey: string) => void;
}

/**
 * Spending per month across a year.
 *
 * Months with no spending are drawn as an empty slot rather than skipped, so
 * the gap between April and July reads as "nothing in May or June" instead
 * of silently compressing the year.
 */
export default function MonthlyBarChart({ data, activeMonth, onSelect }: Props) {
  const dark = useIsDark();

  const axis = dark ? "#6C8090" : "#8B9AA8";
  const accent = dark ? "#5FD0F5" : "#0B6E99";
  const muted = dark ? "rgba(95,208,245,0.28)" : "rgba(11,110,153,0.24)";

  const chartData = data.map((d) => ({
    ...d,
    label: MONTH_ABBR[Number(d.monthKey.slice(5, 7)) - 1],
  }));

  return (
    <div className="h-[220px] w-full sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: axis, fontSize: 11 }}
            interval={0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={54}
            tick={{ fill: axis, fontSize: 11 }}
            tickFormatter={(value: number) => (value === 0 ? "" : formatCurrencyCompact(value))}
          />
          <Bar
            dataKey="total"
            radius={[6, 6, 4, 4]}
            animationDuration={700}
            onClick={(entry: { monthKey?: string }) => {
              if (entry?.monthKey) onSelect?.(entry.monthKey);
            }}
            className={onSelect ? "cursor-pointer" : undefined}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.monthKey}
                fill={!activeMonth || entry.monthKey === activeMonth ? accent : muted}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
