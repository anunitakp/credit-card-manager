"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import clsx from "clsx";

const OPTIONS = [
  { value: "light", label: "Light theme", icon: Sun },
  { value: "system", label: "Match system theme", icon: Monitor },
  { value: "dark", label: "Dark theme", icon: Moon },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Avoid a hydration mismatch: the real theme is only known client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme ?? "system" : "system";

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={clsx(
              "group relative flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150",
              active
                ? "bg-primary-tint text-primary"
                : "text-text-tertiary hover:bg-surface-hover hover:text-text-secondary"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
