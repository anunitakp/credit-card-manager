import { Wallet, type LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, icon: Icon = Wallet, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-tint">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium text-text-primary">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-text-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
