"use client";

import { useActionState, useMemo, useState } from "react";
import { ReadinessSectionHeader } from "@/components/ui/readiness";
import { updateOverheadSettings, type SettingsActionState } from "@/lib/actions/settings";
import { getOverheadReadiness } from "@/lib/readiness/setup-readiness";

type Props = {
  overheadPercent: number | string | null;
  overheadFixedPerJob: number | string | null;
};

export function OverheadSettingsForm({ overheadPercent, overheadFixedPerJob }: Props) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(updateOverheadSettings, undefined);
  const [enabled, setEnabled] = useState(Number(overheadPercent ?? 0) > 0 || Number(overheadFixedPerJob ?? 0) > 0);
  const [percent, setPercent] = useState(String(Number(overheadPercent ?? 0)));
  const [fixed, setFixed] = useState(String(Number(overheadFixedPerJob ?? 0)));

  const readiness = useMemo(
    () =>
      getOverheadReadiness({
        enabled,
        overhead_percent: percent,
        overhead_fixed_per_job: fixed,
      }),
    [enabled, percent, fixed]
  );

  const previewValue = enabled ? overheadPreview(Number(percent), Number(fixed)) : 0;

  return (
    <form action={formAction} className="space-y-4 rounded-lg bg-[var(--tr-surface)] p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <ReadinessSectionHeader
        title="Internal overhead costs"
        subtitle="Used only for internal pricing checks."
        item={readiness}
      />

      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-bg-soft)] px-3 py-2.5">
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => setEnabled(event.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-[var(--tr-bg)] text-[var(--tr-primary)] focus:ring-2 focus:ring-[var(--tr-primary)]"
        />
        <span className="text-sm font-medium text-[var(--tr-text)]">Add overhead to pricing</span>
      </label>

      {!enabled ? (
        <>
          <input type="hidden" name="overhead_percent" value="0" />
          <input type="hidden" name="overhead_fixed_per_job" value="0" />
        </>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">Default overhead percent</span>
          <input
            name={enabled ? "overhead_percent" : undefined}
            type="number"
            min="0"
            max="100"
            step="0.001"
            value={percent}
            onChange={event => setPercent(event.target.value)}
            disabled={!enabled}
            className="tr-input mt-1.5 min-h-11 w-full rounded-lg px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">Fixed overhead per job</span>
          <input
            name={enabled ? "overhead_fixed_per_job" : undefined}
            type="number"
            min="0"
            step="0.01"
            value={fixed}
            onChange={event => setFixed(event.target.value)}
            disabled={!enabled}
            className="tr-input mt-1.5 min-h-11 w-full rounded-lg px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      <div className="rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-bg-soft)] px-3 py-3">
        <p className="text-sm font-semibold text-[var(--tr-text)]">Preview</p>
        <p className="mt-2 text-sm leading-6 text-[var(--tr-text)]">
          $2,500 quote: ${previewValue.toFixed(2)} overhead.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-400">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="tr-primary-action min-h-11 w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save overhead settings"}
      </button>
    </form>
  );
}

function overheadPreview(percent: number, fixed: number) {
  const sampleSubtotal = 2500;
  return sampleSubtotal * (percent / 100) + fixed;
}
