"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Wallet } from "lucide-react";
import clsx from "clsx";
import ThemeToggle from "@/components/ThemeToggle";
import { PRIMARY_NAV, isActive } from "./nav-items";
import { useAddExpense } from "./AddExpenseProvider";
import { useSession } from "./SessionProvider";
import SignOutButton from "./SignOutButton";

/**
 * Desktop navigation rail.
 *
 * Not a card: it is a transparent column inside the app shell, separated by a
 * single hairline. The only filled surface here is the active nav item, which
 * is what makes it obvious at a glance without any other chrome competing.
 *
 * Hidden below `lg`, where the bottom bar takes over.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const { open } = useAddExpense();
  const user = useSession();

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[color:var(--glass-border-soft)] p-4 lg:flex">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
          <Wallet className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-text-primary">
          Expense Tracker
        </span>
      </div>

      <button
        type="button"
        onClick={() => open()}
        className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-card transition-all duration-200 hover:bg-primary-hover active:scale-[0.97]"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add Expense
      </button>

      <p className="mb-1 mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
        Main Menu
      </p>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium",
                "transition-all duration-200",
                active
                  ? // A solid pane, not a tint: the one filled surface in the rail.
                    "bg-[color:var(--glass-bg-strong)] text-primary shadow-card"
                  : "text-text-secondary hover:bg-text-primary/[0.04] hover:text-text-primary"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-3 border-t border-[color:var(--glass-border-soft)] pt-4">
        {user && (
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate px-1 text-sm font-medium text-text-primary">
              {user.username}
            </span>
            <SignOutButton className="shrink-0 px-2" />
          </div>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}
