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
    <form action={formAction} className="space-y-4 rounded-lg bg-[var(--tr-surface)] p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <div>
        <p className="text-sm font-semibold text-[var(--tr-text)]">Internal overhead costs</p>
        <p className="mt-1 text-xs leading-5 text-[var(--tr-text-muted)]">
          These costs stay internal. Taskrel uses them in quote pricing intelligence, but they do not appear on client-facing quotes.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-[var(--tr-text-muted)]">Default overhead percent</span>
        <input
          name="overhead_percent"
          type="number"
          min="0"
          max="100"
          step="0.001"
          defaultValue={Number(overheadPercent ?? 0)}
          className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[var(--tr-text-muted)]">Fixed overhead per job</span>
        <input
          name="overhead_fixed_per_job"
          type="number"
          min="0"
          step="0.01"
          defaultValue={Number(overheadFixedPerJob ?? 0)}
          className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"
        />
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-400">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="tr-primary-action w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save overhead settings"}
      </button>
    </form>
  );
}
