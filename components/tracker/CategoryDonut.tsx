"use client";

import { useState } from "react";
import clsx from "clsx";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import { categoryColor } from "@/lib/category-meta";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { Category } from "@/lib/types";
import { CategoryTotal } from "@/lib/analytics";
import { useIsDark } from "./useIsDark";

interface Props {
  data: CategoryTotal[];
  total: number;
  onSelect?: (category: Category) => void;
  /** Label under the total in the middle of the ring. */
  centerLabel?: string;
  /** Overrides the wrapper sizing, e.g. to fill a stretched card. */
  className?: string;
}

/**
 * Spending by category, drawn as one continuous ring.
 *
 * The segments meet edge to edge with no gap and no rounding, so the chart
 * reads as a single band of spending divided by colour rather than as a row
 * of separate blocks. Hovering or tapping a segment nudges it outward and
 * takes over the centre label, which means the ring doubles as its own
 * legend — no tooltip, which matters on touch where hover does not exist.
 */
export default function CategoryDonut({
  data,
  total,
  onSelect,
  centerLabel = "Total spent",
  className = "h-[240px] sm:h-[260px]",
}: Props) {
  const dark = useIsDark();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const active = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className={clsx("relative w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius="64%"
            outerRadius="92%"
            paddingAngle={0}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            animationDuration={700}
            activeIndex={activeIndex ?? undefined}
            activeShape={(props: object) => (
              <Sector
                {...(props as Record<string, unknown>)}
                outerRadius={((props as { outerRadius: number }).outerRadius ?? 0) + 5}
              />
            )}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(_, index) => onSelect?.(data[index].category)}
            className={onSelect ? "cursor-pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={categoryColor(entry.category, dark)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        {active ? (
          <>
            <p className="tnum text-2xl font-semibold tracking-tight text-text-primary sm:text-[26px]">
              {formatCurrencyCompact(active.amount)}
            </p>
            <p className="mt-1 line-clamp-2 text-xs font-medium text-text-secondary">
              {active.category}
            </p>
            <p className="tnum mt-0.5 text-xs text-text-tertiary">
              {active.share.toFixed(0)}% of spending
            </p>
          </>
        ) : (
          <>
            <p className="tnum text-2xl font-semibold tracking-tight text-text-primary sm:text-[26px]">
              {formatCurrency(total)}
            </p>
            <p className="mt-1 text-xs text-text-secondary">{centerLabel}</p>
          </>
        )}
      </div>
    </div>
  );
}
