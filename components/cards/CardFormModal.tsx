"use client";

import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Info } from "lucide-react";
import GlassButton from "@/components/glass/GlassButton";
import GlassInput, { Field } from "@/components/glass/GlassInput";
import GlassModal from "@/components/glass/GlassModal";
import { ordinalDay } from "@/lib/billing-cycle";
import { Card, CardInput } from "@/lib/types";

interface Props {
  open: boolean;
  /** Null when adding; the card being edited otherwise. */
  card: Card | null;
  /**
   * How many expenses sit on this card. Decides whether retiring it is a
   * reversible archive or a real delete — null while still counting.
   */
  expenseCount: number | null;
  /** False while this is the only active card, which must stay usable. */
  canRetire: boolean;
  onClose: () => void;
  onSubmit: (input: CardInput) => Promise<void>;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

/**
 * Add or edit a card.
 *
 * The retire action is chosen by the data, not by the user: a card with
 * spending on it can only be archived, and a card with none can be deleted
 * outright. There is deliberately no way to reach a destructive delete from
 * a card that has history — the database enforces the same rule, so this is
 * the readable half of a guarantee rather than the whole of it.
 */
export default function CardFormModal({
  open,
  card,
  expenseCount,
  canRetire,
  onClose,
  onSubmit,
  onArchive,
  onRestore,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [billDay, setBillDay] = useState("15");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reseeded whenever the modal opens, so reopening it on a different card
  // never shows the previous card's details for a frame.
  useEffect(() => {
    if (!open) return;
    setName(card?.name ?? "");
    setBillDay(String(card?.bill_day ?? 15));
    setError(null);
  }, [open, card]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) return setError("Give the card a name, e.g. “HDFC Card”.");

    const day = Number(billDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return setError("The bill date must be a whole number between 1 and 31.");
    }

    setSaving(true);
    try {
      await onSubmit({ name: trimmed, bill_day: day });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this card.");
    } finally {
      setSaving(false);
    }
  }

  const day = Number(billDay);
  const dayValid = Number.isInteger(day) && day >= 1 && day <= 31;

  const archived = card?.archived_at != null;
  const hasHistory = expenseCount === null || expenseCount > 0;

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={card ? "Edit card" : "Add a card"}
      subtitle="Each card keeps its own expenses and archives."
      size="sm"
      footer={
        <div className="flex items-center gap-2">
          <div className="flex-1" />
          <GlassButton type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </GlassButton>
          <GlassButton type="submit" form="card-form" variant="primary" disabled={saving}>
            {saving ? "Saving…" : card ? "Save changes" : "Add card"}
          </GlassButton>
        </div>
      }
    >
      <form id="card-form" onSubmit={handleSubmit} className="space-y-4 pb-1">
        <Field
          label="Card name"
          htmlFor="card-name"
          hint="The bank and card, however you refer to it."
        >
          <GlassInput
            id="card-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="HDFC Card"
            maxLength={40}
            autoComplete="off"
          />
        </Field>

        <Field
          label="Bill date"
          htmlFor="card-bill-day"
          hint={
            dayValid
              ? `You can close a month once the ${ordinalDay(day)} has passed.` +
                (day > 28 ? " In shorter months, the last day." : "")
              : "The day of the month your bill falls due, 1 to 31."
          }
        >
          <GlassInput
            id="card-bill-day"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={billDay}
            onChange={(e) => setBillDay(e.target.value)}
            invalid={billDay !== "" && !dayValid}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      {card && (
        <div className="mt-5 border-t border-glass pt-4">
          {archived ? (
            <>
              <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
                This card is archived. Its expenses still count towards every total — it just
                doesn&rsquo;t appear when you add a new one.
              </p>
              <GlassButton type="button" onClick={onRestore} disabled={saving}>
                <ArchiveRestore className="h-4 w-4" aria-hidden />
                Restore card
              </GlassButton>
            </>
          ) : hasHistory ? (
            <>
              <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
                {expenseCount === null
                  ? "Counting what’s on this card…"
                  : `${expenseCount} ${expenseCount === 1 ? "expense is" : "expenses are"} recorded on this card, so it can’t be deleted.`}{" "}
                Archiving keeps every one of them in your totals and archives, and can be undone.
              </p>
              <GlassButton
                type="button"
                onClick={onArchive}
                disabled={saving || !canRetire || expenseCount === null}
                title={
                  canRetire ? undefined : "This is your only active card."
                }
              >
                <Archive className="h-4 w-4" aria-hidden />
                Archive card
              </GlassButton>
            </>
          ) : (
            <>
              <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
                Nothing has been spent on this card, so deleting it loses nothing.
              </p>
              <GlassButton
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={saving || !canRetire}
                title={canRetire ? undefined : "This is your only card."}
              >
                Delete card
              </GlassButton>
            </>
          )}
        </div>
      )}
    </GlassModal>
  );
}
