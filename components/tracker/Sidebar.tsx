"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Wallet } from "lucide-react";
import clsx from "clsx";
import ThemeToggle from "@/components/ThemeToggle";
import { PRIMARY_NAV, isActive } from "./nav-items";
import { useAddExpense } from "./AddExpenseProvider";

/** Desktop navigation rail. Hidden below `lg`, where the bottom bar takes over. */
export default function Sidebar() {
  const pathname = usePathname();
  const { open } = useAddExpense();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col p-4 lg:flex">
      <div className="glass-strong glass-lit flex h-full flex-col rounded-3xl p-4">
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
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-card transition-all duration-200 hover:bg-primary-hover active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Expense
        </button>

        <nav className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto no-scrollbar">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  "transition-colors duration-200",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-text-primary/[0.04] hover:text-text-primary"
                )}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                    aria-hidden
                  />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-glass pt-4">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
