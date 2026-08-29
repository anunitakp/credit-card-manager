"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { CycleWithExpenses } from "@/lib/types";
import { fetchCycle } from "@/lib/api-client";
import { formatCycleLabelShort } from "@/lib/billing-cycle";
import SummaryCards from "@/components/SummaryCards";
import CategoryChart from "@/components/CategoryChart";
import ExpenseTable from "@/components/ExpenseTable";
import { DashboardSkeleton } from "@/components/Skeleton";

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
      <div className="rounded-xl border border-danger/25 bg-danger-bg p-6 text-center text-danger">
        {error}
      </div>
    );
  }

  if (!data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/archives"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Archives
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">
            {formatCycleLabelShort(data.cycle)}
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-border/50 px-2.5 py-1 text-xs font-medium text-text-tertiary">
            <Lock className="h-3 w-3" aria-hidden />
            Archived · Read-only
          </span>
        </div>
      </div>

      <SummaryCards summary={data.summary} />
      <CategoryChart data={data.summary.categoryBreakdown} />

      <div>
        <h2 className="mb-2 text-base font-semibold text-text-primary">Expenses</h2>
        <ExpenseTable expenses={data.expenses} readOnly />
      </div>
    </div>
  );
}
