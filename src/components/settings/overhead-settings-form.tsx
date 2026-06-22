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
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-700/70 bg-[#172235] p-4">
      <ReadinessSectionHeader
        title="Internal overhead costs"
        subtitle="These costs stay internal. Taskrel uses them in quote pricing intelligence, but they do not appear on client-facing quotes."
        item={readiness}
      />

      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2.5">
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => setEnabled(event.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-[#111827] text-[#F97316] focus:ring-2 focus:ring-[#F97316]"
        />
        <span className="text-sm font-medium text-slate-200">Add overhead to pricing</span>
      </label>

      {!enabled ? (
        <>
          <input type="hidden" name="overhead_percent" value="0" />
          <input type="hidden" name="overhead_fixed_per_job" value="0" />
        </>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Default overhead percent</span>
          <input
            name={enabled ? "overhead_percent" : undefined}
            type="number"
            min="0"
            max="100"
            step="0.001"
            value={percent}
            onChange={event => setPercent(event.target.value)}
            disabled={!enabled}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Fixed overhead per job</span>
          <input
            name={enabled ? "overhead_fixed_per_job" : undefined}
            type="number"
            min="0"
            step="0.01"
            value={fixed}
            onChange={event => setFixed(event.target.value)}
            disabled={!enabled}
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          On a $2,500 quote, Taskrel considers ${previewValue.toFixed(2)} overhead.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-400">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#EA6C0A] disabled:cursor-not-allowed disabled:opacity-60"
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
