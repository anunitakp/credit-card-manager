interface Props {
  title: string;
  /** Small line above the title — usually the period being viewed. */
  eyebrow?: string;
  subtitle?: string;
  /** Controls aligned to the right on desktop, wrapped below on mobile. */
  actions?: React.ReactNode;
}

export default function PageHeader({ title, eyebrow, subtitle, actions }: Props) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-text-primary sm:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
