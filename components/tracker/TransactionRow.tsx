"use client";

import { CreditCard, Pencil, Smartphone, Trash2 } from "lucide-react";
import clsx from "clsx";
import CategoryIcon from "@/components/CategoryIcon";
import { categoryColor } from "@/lib/category-meta";
import { formatCurrency } from "@/lib/format";
import { formatDayMonth } from "@/lib/month";
import { Transaction } from "@/lib/types";
import { useIsDark } from "./useIsDark";

interface Props {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  /** Hides the row actions — used for read-only contexts like the dashboard. */
  readOnly?: boolean;
  /** Shows the full date rather than just day + month. */
  showYear?: boolean;
}

/**
 * One transaction.
 *
 * Space is genuinely tight on a phone once the icon, the amount and two
 * action buttons are placed, so the layout gives width away in stages: the
 * account is a labelled chip on desktop but a short word on the meta line on
 * mobile, and every fixed measurement steps down at the small breakpoint.
 *
 * On desktop the edit and delete buttons fade in on hover so a long list
 * stays quiet; on touch, where there is no hover, they are always visible.
 */
export default function TransactionRow({
  transaction: t,
  onEdit,
  onDelete,
  readOnly = false,
  showYear = false,
}: Props) {
  const dark = useIsDark();
  const color = categoryColor(t.category, dark);
  const isUpi = t.account === "UPI";

  return (
    <div className="group flex items-center gap-2.5 rounded-2xl px-2 py-3 transition-colors duration-200 hover:bg-text-primary/[0.035] sm:gap-4 sm:px-4">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
        style={{ backgroundColor: `${color}1f`, color }}
        aria-hidden
      >
        <CategoryIcon
          category={t.category}
          className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]"
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{t.description}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-text-tertiary">
          <span className="tnum shrink-0">
            {showYear
              ? `${formatDayMonth(t.expense_date)} ${t.expense_date.slice(0, 4)}`
              : formatDayMonth(t.expense_date)}
          </span>
          <span aria-hidden>·</span>
          <span className="min-w-0 truncate">{t.category}</span>
        </p>
      </div>

      {/* Fixed-width columns from `sm` up: content-sized chips left the
          amounts ragged, since "UPI" and "Credit Card" differ a lot in width. */}
      <span className="hidden w-[108px] shrink-0 justify-end sm:flex">
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium",
            isUpi ? "bg-text-primary/[0.06] text-text-secondary" : "bg-primary/10 text-primary"
          )}
        >
          {isUpi ? (
            <Smartphone className="h-3 w-3" aria-hidden />
          ) : (
            <CreditCard className="h-3 w-3" aria-hidden />
          )}
          {t.account}
        </span>
      </span>

      {/* Mobile keeps the account, but as an icon beside the amount. A meta
          line holding date, category AND a spelled-out account left roughly
          20px for the category name — so the label goes and the glyph stays,
          with the desktop chip above teaching which glyph is which. */}
      <span
        className={clsx(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg sm:hidden",
          isUpi ? "bg-text-primary/[0.06] text-text-secondary" : "bg-primary/10 text-primary"
        )}
        title={t.account}
      >
        <span className="sr-only">{t.account}</span>
        {isUpi ? (
          <Smartphone className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <CreditCard className="h-3.5 w-3.5" aria-hidden />
        )}
      </span>

      <span className="tnum min-w-[64px] shrink-0 text-right text-sm font-semibold text-text-primary sm:w-[104px] sm:text-[15px]">
        {formatCurrency(t.amount)}
      </span>

      {!readOnly && (onEdit || onDelete) && (
        <div className="flex shrink-0 items-center opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(t)}
              aria-label={`Edit ${t.description}`}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-text-primary/[0.06] hover:text-text-primary sm:h-8 sm:w-8"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(t)}
              aria-label={`Delete ${t.description}`}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger sm:h-8 sm:w-8"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
