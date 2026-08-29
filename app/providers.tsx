"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ToastProvider } from "@/components/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ToastProvider>{children}</ToastProvider>
    </NextThemesProvider>
  );
}
