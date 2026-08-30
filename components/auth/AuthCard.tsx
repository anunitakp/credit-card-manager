"use client";

import { Wallet } from "lucide-react";
import GlassCard from "@/components/glass/GlassCard";

/**
 * The frame shared by sign-in and sign-up.
 *
 * Deliberately not inside the app shell: there is no navigation to show
 * before you are signed in, so the page is one centred pane on the same
 * atmosphere the rest of the app floats on.
 */
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] animate-rise-in">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <Wallet className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">{subtitle}</p>
        </div>

        <GlassCard weight="strong" className="p-6 sm:p-7">
          {children}
        </GlassCard>

        {footer && <div className="mt-5 text-center text-sm text-text-secondary">{footer}</div>}
      </div>
    </div>
  );
}
