"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard } from "lucide-react";
import clsx from "clsx";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", label: "Current Month" },
  { href: "/archives", label: "Archives" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="h-4 w-4" aria-hidden />
          </span>
          <span className="truncate text-[15px] font-semibold tracking-tight text-text-primary">
            Card Expense Tracker
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <nav className="flex gap-0.5 rounded-lg border border-border bg-surface p-0.5">
            {links.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-3",
                    active
                      ? "bg-primary-tint text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
