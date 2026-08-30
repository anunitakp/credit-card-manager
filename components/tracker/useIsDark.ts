"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Whether the dark palette is currently in effect.
 *
 * Charts need real colour values rather than CSS classes, so they cannot
 * lean on the `.dark` class the way the rest of the UI does. This returns
 * false during the server render and the first client paint — matching the
 * light default — and flips once the resolved theme is known, so it never
 * causes a hydration mismatch.
 */
export function useIsDark(): boolean {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && resolvedTheme === "dark";
}
