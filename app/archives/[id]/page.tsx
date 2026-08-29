"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CycleWithExpenses } from "@/lib/types";
import { fetchCycle } from "@/lib/api-client";
import { formatCycleLabel } from "@/lib/billing-cycle";
import SummaryCards from "@/components/SummaryCards";
import CategoryChart from "@/components/CategoryChart";
import ExpenseTable from "@/components/ExpenseTable";

export default function ArchiveDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CycleWithExpenses | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetchCycle(params.id)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load this archive."));
  }, [params.id]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="py-20 text-center text-slate-400">Loading archive…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/archives" className="text-sm text-brand-600 hover:underline">
          ← Back to Archives
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            {formatCycleLabel(data.cycle)}
          </h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            Archived · Read-only
          </span>
        </div>
      </div>

      <SummaryCards summary={data.summary} />
      <CategoryChart data={data.summary.categoryBreakdown} />

      <div>
        <p className="mb-2 text-sm font-medium text-slate-500">Expenses</p>
        <ExpenseTable expenses={data.expenses} readOnly />
      </div>
    </div>
  );
}
