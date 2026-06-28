import type { ReactNode } from "react";

import { Surface } from "@/components/ui/surface";

/**
 * ActionRail — the primary "what is this worth + what do I do next" panel for a
 * detail screen. Consolidates a headline value, status badges, and the primary
 * action buttons into one surface so the next action is never buried beneath
 * secondary panels. Used by the quote and invoice detail pages.
 */
export function ActionRail({
  title,
  value,
  detail,
  badges,
  children,
}: {
  title: string;
  value: string;
  detail?: string;
  badges?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Surface className="p-5">
      <p className="text-base font-semibold text-[var(--tr-text)]">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tr-text)] tabular-nums">{value}</p>
      {detail && <p className="mt-2 text-base leading-6 text-[var(--tr-text-muted)]">{detail}</p>}
      {badges && <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>}
      {children && <div className="mt-5 space-y-4">{children}</div>}
    </Surface>
  );
}
