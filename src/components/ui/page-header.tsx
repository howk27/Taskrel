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
        {eyebrow && <p className="tr-meta mb-1 font-semibold text-[var(--tr-primary)]">{eyebrow}</p>}
        <h1 className="tr-h1 text-[var(--tr-text)]">{title}</h1>
        {subtitle && <p className="tr-body mt-2 max-w-2xl text-[var(--tr-text-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
