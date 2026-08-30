import clsx from "clsx";
import { type LucideIcon } from "lucide-react";
import GlassCard from "@/components/glass/GlassCard";

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "primary" | "warning" | "danger";
  className?: string;
}

const TONE: Record<NonNullable<Props["tone"]>, { icon: string; value: string }> = {
  neutral: { icon: "bg-text-primary/[0.06] text-text-secondary", value: "text-text-primary" },
  primary: { icon: "bg-primary/10 text-primary", value: "text-text-primary" },
  warning: { icon: "bg-warning/10 text-warning", value: "text-warning" },
  danger: { icon: "bg-danger/10 text-danger", value: "text-danger" },
};

/** A single figure with a label. The workhorse of the statistics page. */
export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: Props) {
  const styles = TONE[tone];
  return (
    <GlassCard className={clsx("p-4 sm:p-5", className)} padded={false}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
          {label}
        </p>
        {Icon && (
          <span
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
              styles.icon
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className={clsx("tnum mt-3 text-2xl font-semibold tracking-tight", styles.value)}>
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-text-tertiary">{hint}</p>}
    </GlassCard>
  );
}
