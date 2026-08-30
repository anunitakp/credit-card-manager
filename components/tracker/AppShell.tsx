"use client";

import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import { AddExpenseProvider } from "./AddExpenseProvider";
import { TrackerProvider } from "./TrackerProvider";

/**
 * The frame every page sits inside: the blurred atmosphere layer, the
 * desktop rail, the mobile bottom bar, and the two providers that make the
 * data and the add-expense sheet reachable from anywhere.
 *
 * The bottom padding on mobile clears both the nav bar and the home
 * indicator, so the last row of any list is never trapped underneath them.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TrackerProvider>
      <AddExpenseProvider>
        <div className="app-atmosphere" aria-hidden>
          <span />
        </div>

        <Sidebar />

        {/* Lifted above the atmosphere layer, which now sits at z-0 so that
            modal and nav backdrop-filters have something real to frost. */}
        <div className="relative z-10 lg:pl-[248px]">
          <main className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(env(safe-area-inset-bottom)+104px)] pt-5 sm:px-6 sm:pt-8 lg:pb-14">
            {children}
          </main>
        </div>

        <BottomNav />
      </AddExpenseProvider>
    </TrackerProvider>
  );
}
