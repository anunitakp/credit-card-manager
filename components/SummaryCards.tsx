import { Wallet, CreditCard, ArrowDownLeft, Clock, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { CycleSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface CardDef {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  accent: "neutral" | "primary" | "success" | "warning";
}

const ACCENT_CLASSES: Record<CardDef["accent"], { icon: string; iconBg: string; value: string }> = {
  neutral: { icon: "text-text-secondary", iconBg: "bg-text-primary/[0.06]", value: "text-text-primary" },
  primary: { icon: "text-primary", iconBg: "bg-primary/10", value: "text-primary" },
  success: { icon: "text-success", iconBg: "bg-success/10", value: "text-text-primary" },
  warning: { icon: "text-warning", iconBg: "bg-warning/10", value: "text-text-primary" },
};

export default function SummaryCards({ summary }: { summary: CycleSummary }) {
  const cards: CardDef[] = [
    {
      label: "Total Spending",
      value: summary.totalSpending,
      hint: "All expenses",
      icon: Wallet,
      accent: "neutral",
    },
    {
      label: "My Spending",
      value: summary.mySpending,
      hint: "Your share",
      icon: CreditCard,
      accent: "primary",
    },
    {
      label: "To Get",
      value: summary.amountToGet,
      hint: "Owed by others",
      icon: ArrowDownLeft,
      accent: "success",
    },
    {
      label: "Yet to Get",
      value: summary.amountYetToGet,
      hint: "Outstanding",
      icon: Clock,
      accent: "warning",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const accent = ACCENT_CLASSES[card.accent];
        return (
          <div
            key={card.label}
            className="glass glass-lit group rounded-2xl p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                {card.label}
              </p>
              <span
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  accent.iconBg
                )}
              >
                <card.icon className={clsx("h-3.5 w-3.5", accent.icon)} aria-hidden />
              </span>
            </div>
            <p className={clsx("mt-2 text-[26px] font-semibold leading-tight", accent.value)}>
              {formatCurrency(card.value)}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">{card.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
