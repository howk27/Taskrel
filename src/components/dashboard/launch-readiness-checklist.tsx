import Link from "next/link";
import { CheckCircle, Plus, SealCheck } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import type { LaunchReadinessState } from "@/lib/launch-readiness";

export function LaunchReadinessChecklist({ readiness }: { readiness: LaunchReadinessState }) {
  const nextItem = readiness.items.find(item => !item.complete) ?? readiness.items[readiness.items.length - 1];

  return (
    <Surface className="overflow-hidden border-[var(--tr-orange)]/25">
      <div className="grid gap-5 p-5 lg:grid-cols-[320px_1fr]">
        <div>
          <p className="text-xs font-bold text-[var(--tr-amber)]">
            Setup checklist
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
            {readiness.readyToSendFirstQuote ? "Ready to sell from Taskrel" : "Get ready to send the first quote"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--tr-text-muted)]">
            {readiness.readyToSendFirstQuote
              ? "Your workspace has the basics clients expect: identity, quote defaults, delivery, payments, and a first quote."
              : "Complete these setup steps so the first client quote looks professional and can turn into paid work."}
          </p>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-[var(--tr-text-faint)]">
              <span>{readiness.completedCount} of {readiness.totalCount} ready</span>
              <span>{readiness.percentComplete}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-950">
              <div
                className="h-full rounded-full bg-[var(--tr-orange)] transition-all"
                style={{ width: `${readiness.percentComplete}%` }}
              />
            </div>
          </div>

          <Link
            href={nextItem.href}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--tr-orange)] px-4 text-sm font-bold text-[#241205] transition-colors hover:bg-[var(--tr-amber)] sm:w-auto"
          >
            <Plus size={17} weight="bold" />
            {readiness.readyToSendFirstQuote ? "New quote" : nextItem.actionLabel}
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {readiness.items.map(item => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-xl border p-4 transition-colors ${
                item.complete
                  ? "border-[var(--tr-green)]/20 bg-[var(--tr-green)]/8 hover:bg-[var(--tr-green)]/12"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 ${item.complete ? "text-[var(--tr-green)]" : "text-[var(--tr-amber)]"}`}>
                  {item.complete ? <CheckCircle size={19} weight="duotone" /> : <SealCheck size={19} weight="duotone" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--tr-text-muted)]">{item.detail}</p>
                  <p className="mt-3 text-xs leading-5 text-[var(--tr-text-faint)]">{item.impact}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Surface>
  );
}
