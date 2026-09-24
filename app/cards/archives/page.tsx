"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ChevronRight, CreditCard } from "lucide-react";
import { ArchiveListItem, Card } from "@/lib/types";
import { fetchArchives, fetchCards } from "@/lib/api-client";
import { cycleMonthLabel } from "@/lib/billing-cycle";
import { formatCurrency } from "@/lib/format";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import CardSwitcher from "@/components/cards/CardSwitcher";

export default function ArchivesPage() {
  const [items, setItems] = useState<ArchiveListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Null means "every card". Archives default to showing all of them: the
   * question you open this page with is usually "what did I spend back
   * then", not "what did this one card spend back then".
   */
  const [cards, setCards] = useState<Card[]>([]);
  const [cardId, setCardId] = useState<string | null>(null);

  const load = useCallback(async (filter: string | null) => {
    setItems(null);
    setError(null);
    try {
      setItems(await fetchArchives(filter ?? undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load archives.");
    }
  }, []);

  useEffect(() => {
    // Archived cards included: their closed months are exactly the history
    // this page exists to show.
    fetchCards(true)
      .then(setCards)
      .catch(() => {
        // The switcher degrades to hidden; the list below still loads.
      });
  }, []);

  useEffect(() => {
    void load(cardId);
  }, [load, cardId]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Archives
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary sm:text-[28px]">
          Archived Months
        </h1>
      </div>

      {cards.length > 1 && (
        <CardSwitcher
          cards={cards}
          activeId={cardId}
          onSelect={setCardId}
          allOption={{
            label: "All cards",
            active: cardId === null,
            onSelect: () => setCardId(null),
          }}
        />
      )}

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
          description="Close a month on one of your cards and it'll show up here, read-only and preserved."
        />
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/cards/archives/${item.id}`}
                className="glass glass-lit group flex items-center gap-4 rounded-2xl p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-card-hover sm:p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border/60">
                  <Archive className="h-4 w-4 text-text-secondary" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  {/* Named by the month it billed, not by a date range: the
                      open month has no fixed window, so a range would be
                      describing a rule the app does not follow. */}
                  <p className="font-medium text-text-primary">
                    {cycleMonthLabel(item.end_date)}
                  </p>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      <CreditCard className="h-3 w-3" aria-hidden />
                      {item.card_name}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-border/50 px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                      Archived · Read-only
                    </span>
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
