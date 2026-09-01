"use client";

import { useState } from "react";
import clsx from "clsx";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import { tripCategoryColor } from "@/lib/category-meta";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { TripCategory } from "@/lib/types";
import { useIsDark } from "@/components/tracker/useIsDark";

export interface TripCategorySlice {
  category: TripCategory;
  amount: number;
  share: number;
}

interface Props {
  data: TripCategorySlice[];
  total: number;
  centerLabel?: string;
  className?: string;
}

/**
 * Same ring as {@link CategoryDonut}, keyed to trip categories instead of the
 * main expense categories — a trip's spend is small enough that a second,
 * differently-coloured ring reads as its own thing rather than a clash with
 * the Statistics page's chart.
 */
export default function TripCategoryDonut({
  data,
  total,
  centerLabel = "Spent on this trip",
  className = "h-[220px] sm:h-[240px]",
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
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={tripCategoryColor(entry.category, dark)} />
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
