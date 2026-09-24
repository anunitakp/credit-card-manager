import {
  ArchiveListItem,
  Card,
  CardInput,
  CardSummary,
  CycleWithExpenses,
  Expense,
  ExpenseInput,
  SettlementStatus,
} from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/**
 * The cards on this account. Never empty: the server creates the implicit
 * first card if there is none, so the page has no "no cards yet" state to
 * design around.
 */
export function fetchCards(includeArchived = false): Promise<CardSummary[]> {
  const query = includeArchived ? "?includeArchived=1" : "";
  return fetch(`/api/cards${query}`, { cache: "no-store" }).then((r) => handle(r));
}

/** Retire a card, or bring it back. Never touches its expenses. */
export function setCardArchived(id: string, archived: boolean): Promise<Card> {
  return fetch(`/api/cards/${id}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived }),
  }).then((r) => handle(r));
}

export function createCard(input: CardInput): Promise<Card> {
  return fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle(r));
}

export function updateCard(id: string, input: CardInput): Promise<Card> {
  return fetch(`/api/cards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle(r));
}

export function deleteCard(id: string): Promise<{ ok: true }> {
  return fetch(`/api/cards/${id}`, { method: "DELETE" }).then((r) => handle(r));
}

/** Omitting `cardId` falls back to the account's first card. */
export function fetchCurrentCycle(cardId?: string): Promise<CycleWithExpenses> {
  const query = cardId ? `?cardId=${encodeURIComponent(cardId)}` : "";
  return fetch(`/api/cycles/current${query}`, { cache: "no-store" }).then((r) => handle(r));
}

export function fetchCycle(id: string): Promise<CycleWithExpenses> {
  return fetch(`/api/cycles/${id}`, { cache: "no-store" }).then((r) => handle(r));
}

/** Omitting `cardId` lists archived months across every card. */
export function fetchArchives(cardId?: string): Promise<ArchiveListItem[]> {
  const query = cardId ? `?cardId=${encodeURIComponent(cardId)}` : "";
  return fetch(`/api/cycles/archives${query}`, { cache: "no-store" }).then((r) => handle(r));
}

export function closeCurrentCycle(cardId?: string): Promise<CycleWithExpenses> {
  const query = cardId ? `?cardId=${encodeURIComponent(cardId)}` : "";
  return fetch(`/api/cycles/current/close${query}`, { method: "POST" }).then((r) => handle(r));
}

export function createExpense(cycleId: string, input: ExpenseInput): Promise<Expense> {
  return fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, cycle_id: cycleId }),
  }).then((r) => handle(r));
}

export function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  return fetch(`/api/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle(r));
}

export function deleteExpense(id: string): Promise<{ ok: true }> {
  return fetch(`/api/expenses/${id}`, { method: "DELETE" }).then((r) => handle(r));
}

export function updateSettlement(id: string, status: SettlementStatus): Promise<Expense> {
  return fetch(`/api/expenses/${id}/settlement`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settlement_status: status }),
  }).then((r) => handle(r));
}
