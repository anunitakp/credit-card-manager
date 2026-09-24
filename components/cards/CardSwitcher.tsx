"use client";

import { Archive, CreditCard, Plus } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/lib/types";

interface Props {
  cards: Card[];
  activeId: string | null;
  onSelect: (cardId: string) => void;
  /** Omitted where adding a card makes no sense, such as the archives list. */
  onAdd?: () => void;
  /** Extra chip shown first, e.g. "All cards" on the archives list. */
  allOption?: { label: string; active: boolean; onSelect: () => void };
}

/**
 * The row of cards at the top of the Cards and Archives pages.
 *
 * A row of chips rather than a dropdown: with two or three cards, seeing them
 * all at once is the point — you switch between them far more often than you
 * pick from a long list, and a dropdown would hide the fact that a second
 * card exists at all.
 *
 * No bill dates here. The chip is an identity, not a schedule.
 */
export default function CardSwitcher({ cards, activeId, onSelect, onAdd, allOption }: Props) {
  return (
    <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
      {allOption && (
        <Chip label={allOption.label} active={allOption.active} onClick={allOption.onSelect} />
      )}

      {cards.map((card) => (
        <Chip
          key={card.id}
          label={card.name}
          active={card.id === activeId}
          onClick={() => onSelect(card.id)}
          icon
          archived={card.archived_at !== null}
        />
      ))}

      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-dashed border-glass px-3.5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-text-primary/[0.05] hover:text-text-primary"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add card
        </button>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  icon = false,
  archived = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: boolean;
  /** Retired: still openable, visibly set apart from the cards in use. */
  archived?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={clsx(
        "flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition-colors duration-150",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-glass bg-white/40 text-text-primary hover:bg-text-primary/[0.05] dark:bg-white/[0.05]"
      )}
    >
      {icon &&
        (archived ? (
          <Archive className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden />
        ) : (
          <CreditCard
            className={clsx("h-4 w-4 shrink-0", active ? "text-primary" : "text-text-tertiary")}
            aria-hidden
          />
        ))}
      <span className={archived ? "text-text-tertiary" : undefined}>{label}</span>
    </button>
  );
}
