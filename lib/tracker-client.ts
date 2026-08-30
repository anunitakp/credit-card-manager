import {
  Budget,
  BudgetInput,
  Note,
  NoteInput,
  Transaction,
  Trip,
  TripInput,
  UpiExpenseInput,
} from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Response had no JSON body; the status-code message stands.
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const noStore: RequestInit = { cache: "no-store" };

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

export function fetchTransactions(): Promise<Transaction[]> {
  return fetch("/api/transactions", noStore).then((r) => handle<Transaction[]>(r));
}

export function createUpiExpense(input: UpiExpenseInput) {
  return fetch("/api/upi-expenses", json("POST", input)).then((r) => handle(r));
}

export function updateUpiExpense(id: string, input: UpiExpenseInput) {
  return fetch(`/api/upi-expenses/${id}`, json("PUT", input)).then((r) => handle(r));
}

export function deleteUpiExpense(id: string) {
  return fetch(`/api/upi-expenses/${id}`, { method: "DELETE" }).then((r) => handle(r));
}

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */

export function fetchBudgets(): Promise<Budget[]> {
  return fetch("/api/budgets", noStore).then((r) => handle<Budget[]>(r));
}

/** Sets or clears one standing budget. */
export function saveBudget(input: BudgetInput) {
  return fetch("/api/budgets", json("PUT", input)).then((r) => handle(r));
}

/* ------------------------------------------------------------------ */
/* Trips                                                               */
/* ------------------------------------------------------------------ */

export function fetchTrips(): Promise<Trip[]> {
  return fetch("/api/trips", noStore).then((r) => handle<Trip[]>(r));
}

export function createTrip(input: TripInput) {
  return fetch("/api/trips", json("POST", input)).then((r) => handle(r));
}

export function updateTrip(id: string, input: TripInput) {
  return fetch(`/api/trips/${id}`, json("PUT", input)).then((r) => handle(r));
}

export function deleteTrip(id: string) {
  return fetch(`/api/trips/${id}`, { method: "DELETE" }).then((r) => handle(r));
}

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

export function fetchNotes(): Promise<Note[]> {
  return fetch("/api/notes", noStore).then((r) => handle<Note[]>(r));
}

export function createNote(input: NoteInput) {
  return fetch("/api/notes", json("POST", input)).then((r) => handle(r));
}

export function updateNote(id: string, input: NoteInput) {
  return fetch(`/api/notes/${id}`, json("PUT", input)).then((r) => handle(r));
}

export function deleteNote(id: string) {
  return fetch(`/api/notes/${id}`, { method: "DELETE" }).then((r) => handle(r));
}
