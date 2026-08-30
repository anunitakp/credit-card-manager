"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Plus, X } from "lucide-react";
import clsx from "clsx";
import ThemeToggle from "@/components/ThemeToggle";
import { BOTTOM_NAV, MORE_NAV, isActive } from "./nav-items";
import { useAddExpense } from "./AddExpenseProvider";
import { useSession } from "./SessionProvider";
import SignOutButton from "./SignOutButton";

/**
 * Mobile navigation: four destinations, a More sheet for the rest, and a
 * floating Add Expense button that sits above the bar.
 *
 * The bar itself is glass over the page content, and respects the iOS home
 * indicator through `env(safe-area-inset-bottom)`.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { open } = useAddExpense();
  const user = useSession();
  const [moreOpen, setMoreOpen] = useState(false);

  // Navigating away should never leave the sheet hanging open behind the
  // new page.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const moreActive = MORE_NAV.some((item) => isActive(item.href, pathname));

  return (
    <>
      {/* Floating add button */}
      <button
        type="button"
        onClick={() => open()}
        aria-label="Add expense"
        className={clsx(
          "fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl lg:hidden",
          "bg-primary text-primary-foreground shadow-modal",
          "transition-transform duration-200 active:scale-90"
        )}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 92px)" }}
      >
        <Plus className="h-6 w-6" aria-hidden />
      </button>

      {moreOpen && (
        <div
          className="fixed inset-0 z-[48] bg-[rgb(6_14_20_/_0.45)] backdrop-blur-md animate-fade-in lg:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="glass-strong glass-lit absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+24px)] animate-sheet-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">More</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-text-primary/5 hover:text-text-primary"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 rounded-2xl border border-glass px-4 py-3.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "bg-white/40 text-text-primary dark:bg-white/[0.05]"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-glass bg-white/40 px-4 py-3 dark:bg-white/[0.05]">
              <span className="text-sm font-medium text-text-primary">Appearance</span>
              <ThemeToggle compact />
            </div>

            {user && (
              <div className="mt-2 flex items-center justify-between rounded-2xl border border-glass bg-white/40 px-4 py-2.5 dark:bg-white/[0.05]">
                <span className="min-w-0 truncate text-sm font-medium text-text-primary">
                  {user.username}
                </span>
                <SignOutButton className="shrink-0" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating rather than docked to the bottom edge: it is inset on all
          four sides so the page washes past underneath it, which is the whole
          point of frosting it. Sitting flush to the edge, the blur had nothing
          to reveal along three of its sides. */}
      <nav
        aria-label="Primary"
        className="glass-strong glass-lit fixed inset-x-3 z-40 flex rounded-3xl p-1.5 shadow-modal lg:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2"
            >
              <span
                className={clsx(
                  "flex h-8 w-full max-w-[64px] items-center justify-center rounded-xl transition-all duration-300",
                  active ? "bg-primary/10 text-primary" : "text-text-tertiary"
                )}
              >
                <Icon className="h-[19px] w-[19px]" aria-hidden />
              </span>
              <span
                className={clsx(
                  "text-[10px] font-medium transition-colors duration-200",
                  active ? "text-primary" : "text-text-tertiary"
                )}
              >
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className="group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2"
        >
          <span
            className={clsx(
              "flex h-8 w-full max-w-[64px] items-center justify-center rounded-xl transition-all duration-300",
              moreActive || moreOpen ? "bg-primary/10 text-primary" : "text-text-tertiary"
            )}
          >
            <MoreHorizontal className="h-[19px] w-[19px]" aria-hidden />
          </span>
          <span
            className={clsx(
              "text-[10px] font-medium transition-colors duration-200",
              moreActive || moreOpen ? "text-primary" : "text-text-tertiary"
            )}
          >
            More
          </span>
        </button>
      </nav>
    </>
  );
}
