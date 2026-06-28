import Link from "next/link";
import type { ReactNode } from "react";

import { CheckCircle, SealCheck } from "@/components/ui/icons";
import type { ReadinessItem, ReadinessState } from "@/lib/readiness/setup-readiness";

const stateCopy: Record<ReadinessState, string> = {
  complete: "Complete",
  needs_attention: "Needs attention",
  optional: "Optional",
  error: "Error",
  pending: "Pending",
};

const stateClass: Record<ReadinessState, string> = {
  complete: "bg-[var(--tr-green)]/10 text-[var(--tr-green)] ring-[var(--tr-green)]/25",
  needs_attention: "bg-[var(--tr-amber)]/10 text-[var(--tr-amber)] ring-[var(--tr-amber)]/25",
  optional: "bg-[var(--tr-surface-2)] text-[var(--tr-text-muted)] ring-[var(--tr-border)]",
  error: "bg-[var(--tr-red)]/10 text-[var(--tr-red)] ring-[var(--tr-red)]/25",
  pending: "bg-[var(--tr-primary)]/10 text-[var(--tr-primary)] ring-[var(--tr-primary)]/25",
};

function iconFor(state: ReadinessState) {
  if (state === "complete") return <CheckCircle size={16} weight="duotone" />;
  return <SealCheck size={16} weight="duotone" />;
}

export function ReadinessChip({ state }: { state: ReadinessState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold leading-none ring-1 ${stateClass[state]}`}
    >
      {iconFor(state)}
      {stateCopy[state]}
    </span>
  );
}

export function ReadinessRow({ item }: { item: ReadinessItem }) {
  return (
    <div className="tr-card flex items-start justify-between gap-4 rounded-lg p-4">
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-[var(--tr-text)]">{item.label}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">{item.detail}</p>
        {item.actionLabel && item.href && (
          <Link
            href={item.href}
            className="mt-3 inline-flex min-h-10 items-center rounded-lg pr-3 text-sm font-semibold text-[var(--tr-primary)] transition-colors hover:text-[var(--tr-text)]"
          >
            {item.actionLabel}
          </Link>
        )}
      </div>
      <ReadinessChip state={item.state} />
    </div>
  );
}

export function ReadinessList({ items }: { items: ReadinessItem[] }) {
  return (
    <div className="space-y-3">
      {items.map(item => (
        <ReadinessRow key={item.key} item={item} />
      ))}
    </div>
  );
}

export function ReadinessSectionHeader({
  title,
  subtitle,
  item,
  icon,
}: {
  title: string;
  subtitle?: string;
  item: ReadinessItem;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--tr-text)]">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{subtitle}</p>}
      </div>
      <ReadinessChip state={item.state} />
    </div>
  );
}
