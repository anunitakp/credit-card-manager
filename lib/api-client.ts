import { ArchiveListItem, CycleWithExpenses, Expense, ExpenseInput, SettlementStatus } from "./types";

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

export function fetchCurrentCycle(): Promise<CycleWithExpenses> {
  return fetch("/api/cycles/current", { cache: "no-store" }).then((r) => handle(r));
}

export function fetchCycle(id: string): Promise<CycleWithExpenses> {
  return fetch(`/api/cycles/${id}`, { cache: "no-store" }).then((r) => handle(r));
}

export function fetchArchives(): Promise<ArchiveListItem[]> {
  return fetch("/api/cycles/archives", { cache: "no-store" }).then((r) => handle(r));
}

export function closeCurrentCycle(): Promise<CycleWithExpenses> {
  return fetch("/api/cycles/current/close", { method: "POST" }).then((r) => handle(r));
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
