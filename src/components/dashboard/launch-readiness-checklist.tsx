import Link from "next/link";
import { Plus, SealCheck } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import type { LaunchReadinessState } from "@/lib/launch-readiness";

export function LaunchReadinessChecklist({ readiness }: { readiness: LaunchReadinessState }) {
  const nextItem = readiness.items.find(item => !item.complete) ?? readiness.items[readiness.items.length - 1];
  const remainingCount = readiness.totalCount - readiness.completedCount;

  return (
    <Surface className="p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--tr-text)]">Finish setup</h2>
          <p className="mt-1 text-base leading-7 text-[var(--tr-text-muted)]">
            {remainingCount} {remainingCount === 1 ? "item" : "items"} left before quote delivery is fully ready.
          </p>
          <div className="mt-4 max-w-md">
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-[var(--tr-text-muted)]">
              <span>{readiness.completedCount} of {readiness.totalCount} ready</span>
              <span>{readiness.percentComplete}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-[var(--tr-bg-soft)]">
              <div
                className="h-full rounded-sm bg-[var(--tr-primary)] transition-[width]"
                style={{ width: `${readiness.percentComplete}%` }}
              />
            </div>
          </div>
        </div>

        <Link
          href={nextItem.href}
          className="rounded-lg bg-[var(--tr-bg-soft)] p-4 transition-colors shadow-[inset_0_0_0_1px_var(--tr-border-soft)] hover:bg-[var(--tr-surface-2)] lg:w-[340px]"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[var(--tr-amber)]">
              <SealCheck size={19} weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-[var(--tr-text)]">{nextItem.label}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">{nextItem.detail}</p>
              <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--tr-primary)]">
                <Plus size={17} weight="bold" />
                {nextItem.actionLabel}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </Surface>
  );
}
