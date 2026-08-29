"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArchiveListItem } from "@/lib/types";
import { fetchArchives } from "@/lib/api-client";
import { formatCycleLabel } from "@/lib/billing-cycle";
import { formatCurrency } from "@/lib/format";

export default function ArchivesPage() {
  const [items, setItems] = useState<ArchiveListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArchives()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load archives."));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Archives</p>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Closed Billing Cycles
        </h1>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!items && !error && (
        <div className="py-16 text-center text-slate-400">Loading archives…</div>
      )}

      {items && items.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
          No closed billing cycles yet. Close your current month to start building your archive.
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/archives/${item.id}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{formatCycleLabel(item)}</p>
                  <p className="text-xs text-slate-400">Closed</p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Total Spending</p>
                    <p className="font-semibold text-slate-700">
                      {formatCurrency(item.totalSpending)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">My Spending</p>
                    <p className="font-semibold text-brand-700">
                      {formatCurrency(item.mySpending)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
