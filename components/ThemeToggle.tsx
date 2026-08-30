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

/**
 * Light / system / dark, as three glass segments.
 *
 * `compact` drops the segment width for tight spots such as the mobile More
 * sheet; the full-width version fills the sidebar footer.
 */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  // The real theme is only known client-side, so render "system" until
  // mounted to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? (theme ?? "system") : "system";

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={clsx(
        "glass-subtle flex items-center gap-0.5 rounded-xl border border-glass p-1",
        !compact && "w-full"
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={clsx(
              "flex h-8 items-center justify-center rounded-lg transition-all duration-200",
              compact ? "w-9" : "flex-1",
              active
                ? "bg-white/85 text-primary shadow-card dark:bg-white/[0.13]"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
