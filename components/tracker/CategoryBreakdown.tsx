"use client";

import clsx from "clsx";
import CategoryIcon from "@/components/CategoryIcon";
import { categoryColor } from "@/lib/category-meta";
import { formatCurrency } from "@/lib/format";
import { Category } from "@/lib/types";
import { CategoryTotal } from "@/lib/analytics";
import { useIsDark } from "./useIsDark";

interface Props {
  data: CategoryTotal[];
  onSelect?: (category: Category) => void;
  /** Caps the list; the rest stay hidden until the page asks for them. */
  limit?: number;
}

/**
 * Ranked category list with an inline share bar.
 *
 * The bar is scaled against the *largest* category rather than against the
 * total, because at fourteen categories a share-of-total bar would render
 * almost everything as an invisible sliver.
 */
export default function CategoryBreakdown({ data, onSelect, limit }: Props) {
  const dark = useIsDark();
  const rows = limit ? data.slice(0, limit) : data;
  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.amount)) : 0;

  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-text-tertiary">
        No spending to break down yet.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {rows.map((row) => {
        const color = categoryColor(row.category, dark);
        const width = max > 0 ? (row.amount / max) * 100 : 0;
        const Row = onSelect ? "button" : "div";

        return (
          <li key={row.category}>
            <Row
              {...(onSelect
                ? {
                    type: "button" as const,
                    onClick: () => onSelect(row.category),
                    "aria-label": `View ${row.category} transactions`,
                  }
                : {})}
              className={clsx(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-200",
                onSelect && "hover:bg-text-primary/[0.035]"
              )}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}1f`, color }}
                aria-hidden
              >
                <CategoryIcon category={row.category} className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {row.category}
                  </span>
                  <span className="tnum shrink-0 text-sm font-semibold text-text-primary">
                    {formatCurrency(row.amount)}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-text-primary/[0.07]">
                    <span
                      className="block h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${width}%`, backgroundColor: color }}
                    />
                  </span>
                  <span className="tnum w-9 shrink-0 text-right text-[11px] text-text-tertiary">
                    {row.share.toFixed(0)}%
                  </span>
                </div>
              </div>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}
