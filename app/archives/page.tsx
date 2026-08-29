"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ChevronRight } from "lucide-react";
import { ArchiveListItem } from "@/lib/types";
import { fetchArchives } from "@/lib/api-client";
import { formatCycleLabelShort } from "@/lib/billing-cycle";
import { formatCurrency } from "@/lib/format";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";

export default function ArchivesPage() {
  const [items, setItems] = useState<ArchiveListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArchives()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load archives."));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Archives
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">
          Archived Billing Cycles
        </h1>
      </div>

      {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

      {!items && !error && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {items && items.length === 0 && (
        <EmptyState
          icon={Archive}
          title="No archives yet"
          description="Close your current billing cycle and it'll show up here, read-only and preserved."
        />
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/archives/${item.id}`}
                className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover sm:p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border/60">
                  <Archive className="h-4 w-4 text-text-secondary" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text-primary">
                    {formatCycleLabelShort(item)}
                  </p>
                  <span className="mt-1 inline-flex items-center rounded-full bg-border/50 px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                    Archived · Read-only
                  </span>
                </div>

                <div className="hidden shrink-0 gap-6 text-right sm:flex">
                  <div>
                    <p className="text-xs text-text-tertiary">Spent</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatCurrency(item.totalSpending)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Your share</p>
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrency(item.mySpending)}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  className="h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <div className="mt-2 flex gap-6 text-xs text-text-secondary sm:hidden">
                <span>{formatCurrency(item.totalSpending)} spent</span>
                <span>{formatCurrency(item.mySpending)} your share</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
