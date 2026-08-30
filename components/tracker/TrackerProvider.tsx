"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Budget, Note, Transaction, Trip } from "@/lib/types";
import {
  fetchBudgets,
  fetchNotes,
  fetchTransactions,
  fetchTrips,
} from "@/lib/tracker-client";

/**
 * One store for the whole tracker.
 *
 * All four collections are loaded once and held here, and every page derives
 * what it shows from them. That is what keeps the dashboard, budget page and
 * statistics from ever disagreeing: they are not four queries that might
 * return different snapshots, they are four views of one array.
 *
 * After any mutation a page calls `refresh()`, which refetches from the
 * server rather than patching local state — the server is the only thing
 * that knows, for instance, that a credit-card expense was also edited on
 * another device.
 */

interface TrackerState {
  transactions: Transaction[];
  budgets: Budget[];
  trips: Trip[];
  notes: Note[];
  loading: boolean;
  /** Set when the initial load failed; mutations report their own errors. */
  error: string | null;
  refresh: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshBudgets: () => Promise<void>;
  refreshTrips: () => Promise<void>;
  refreshNotes: () => Promise<void>;
}

const TrackerContext = createContext<TrackerState | null>(null);

export function useTracker(): TrackerState {
  const ctx = useContext(TrackerContext);
  if (!ctx) {
    throw new Error("useTracker must be used inside <TrackerProvider>.");
  }
  return ctx;
}

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTransactions = useCallback(async () => {
    setTransactions(await fetchTransactions());
  }, []);

  const refreshBudgets = useCallback(async () => {
    setBudgets(await fetchBudgets());
  }, []);

  const refreshTrips = useCallback(async () => {
    setTrips(await fetchTrips());
  }, []);

  const refreshNotes = useCallback(async () => {
    setNotes(await fetchNotes());
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [t, b, tr, n] = await Promise.all([
        fetchTransactions(),
        fetchBudgets(),
        fetchTrips(),
        fetchNotes(),
      ]);
      setTransactions(t);
      setBudgets(b);
      setTrips(tr);
      setNotes(n);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your data.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Coming back to the tab after adding something on another device (or in
  // the Credit Card Manager in another tab) should show the new numbers, not
  // a stale snapshot.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const value = useMemo<TrackerState>(
    () => ({
      transactions,
      budgets,
      trips,
      notes,
      loading,
      error,
      refresh,
      refreshTransactions,
      refreshBudgets,
      refreshTrips,
      refreshNotes,
    }),
    [
      transactions,
      budgets,
      trips,
      notes,
      loading,
      error,
      refresh,
      refreshTransactions,
      refreshBudgets,
      refreshTrips,
      refreshNotes,
    ]
  );

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}
