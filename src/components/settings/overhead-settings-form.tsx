"use client";

import { useActionState } from "react";
import { updateOverheadSettings, type SettingsActionState } from "@/lib/actions/settings";

type Props = {
  overheadPercent: number | string | null;
  overheadFixedPerJob: number | string | null;
};

export function OverheadSettingsForm({ overheadPercent, overheadFixedPerJob }: Props) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(updateOverheadSettings, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-4">
      <div>
        <p className="text-sm font-semibold text-white">Internal overhead costs</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          These costs stay internal. Taskrel uses them in the quote pricing check, but they do not appear on client-facing quotes.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Default overhead percent</span>
        <input
          name="overhead_percent"
          type="number"
          min="0"
          max="100"
          step="0.001"
          defaultValue={Number(overheadPercent ?? 0)}
          className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-600"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Fixed overhead per job</span>
        <input
          name="overhead_fixed_per_job"
          type="number"
          min="0"
          step="0.01"
          defaultValue={Number(overheadFixedPerJob ?? 0)}
          className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-600"
        />
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-400">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--tr-blue)] px-4 py-2.5 text-sm font-semibold text-[#09204f] transition-colors hover:bg-[#a9c6ff] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save overhead settings"}
      </button>
    </form>
  );
}
