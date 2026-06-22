import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-primary)]">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--tr-text)] md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--tr-text-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
