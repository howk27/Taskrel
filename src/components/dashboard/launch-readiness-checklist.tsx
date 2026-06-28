import Link from "next/link";
import { ArrowRight, SealCheck } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import type { LaunchReadinessState } from "@/lib/launch-readiness";

export function LaunchReadinessChecklist({ readiness }: { readiness: LaunchReadinessState }) {
  const nextItem = readiness.items.find(item => !item.complete) ?? readiness.items[readiness.items.length - 1];

  return (
    <Surface className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 shrink-0 text-[var(--tr-amber)]">
            <SealCheck size={20} weight="duotone" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h2 className="text-base font-semibold text-[var(--tr-text)]">Finish setup</h2>
              <span className="text-sm text-[var(--tr-text-muted)]">
                {readiness.completedCount} of {readiness.totalCount} ready
              </span>
            </div>
            <p className="mt-0.5 text-sm leading-6 text-[var(--tr-text-muted)]">
              <span className="font-medium text-[var(--tr-text)]">{nextItem.label}:</span> {nextItem.detail}
            </p>
            <div className="mt-2 h-1 max-w-xs overflow-hidden rounded-full bg-[var(--tr-bg-soft)]">
              <div
                className="h-full rounded-full bg-[var(--tr-primary)] transition-[width]"
                style={{ width: `${readiness.percentComplete}%` }}
              />
            </div>
          </div>
        </div>

        <Link
          href={nextItem.href}
          className="tr-primary-action inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
        >
          {nextItem.actionLabel}
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    </Surface>
  );
}
