import { CycleSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface CardDef {
  label: string;
  value: number;
  hint: string;
  accent: string;
}

export default function SummaryCards({ summary }: { summary: CycleSummary }) {
  const cards: CardDef[] = [
    {
      label: "Total Spending",
      value: summary.totalSpending,
      hint: "All expenses, full amount",
      accent: "text-slate-900",
    },
    {
      label: "My Spending",
      value: summary.mySpending,
      hint: "What you actually owe",
      accent: "text-brand-700",
    },
    {
      label: "Amount to Get",
      value: summary.amountToGet,
      hint: "Owed by others, total",
      accent: "text-emerald-700",
    },
    {
      label: "Amount Yet to Get",
      value: summary.amountYetToGet,
      hint: "Still not settled",
      accent: "text-amber-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
        >
          <p className="text-sm font-medium text-slate-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${card.accent}`}>
            {formatCurrency(card.value)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}
