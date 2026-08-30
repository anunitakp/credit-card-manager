"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import { AddExpenseProvider } from "./AddExpenseProvider";
import { SessionProvider } from "./SessionProvider";
import { TrackerProvider } from "./TrackerProvider";

const AUTH_ROUTES = ["/login", "/signup"];

/**
 * The frame every page sits inside.
 *
 * On desktop the app is one large glass pane floating on the atmosphere,
 * with the background wash visible around all four edges. The sidebar is a
 * transparent column inside that pane rather than a card of its own, and the
 * page scrolls *within* the pane — so the shell holds still and only the
 * content moves, which is what makes it read as an app window rather than a
 * web page.
 *
 * Below `lg` the pane is dropped: a phone has no width to give away, so the
 * layout goes edge to edge with a floating bottom bar.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const atmosphere = (
    <div className="app-atmosphere" aria-hidden>
      <span className="streak" />
      <span className="blob" />
    </div>
  );

  // Sign-in and sign-up sit outside the app: no navigation to somewhere you
  // cannot go yet, and crucially no data providers — those would fire
  // fetches that are certain to come back 401.
  if (AUTH_ROUTES.includes(pathname)) {
    return (
      <>
        {atmosphere}
        <div className="relative z-10">{children}</div>
      </>
    );
  }

  return (
    <SessionProvider>
      <TrackerProvider>
        <AddExpenseProvider>
          {atmosphere}

          <div className="relative z-10 lg:p-5">
            <div className="app-shell lg:flex lg:h-[calc(100dvh_-_40px)]">
              <Sidebar />

              {/* `min-h-0` is load-bearing: a flex item defaults to
                  `min-height: auto`, so without it `main` grows to its
                  content height instead of the shell's, and the overflow
                  rule never engages — the list just gets clipped by the
                  shell with no way to scroll to the rest. */}
              <main className="min-h-0 min-w-0 flex-1 lg:overflow-y-auto">
                <div className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(env(safe-area-inset-bottom)+104px)] pt-5 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
                  {children}
                </div>
              </main>
            </div>
          </div>

          <BottomNav />
        </AddExpenseProvider>
      </TrackerProvider>
    </SessionProvider>
  );
}
