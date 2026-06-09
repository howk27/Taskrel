"use client";

import { useActionState } from "react";
import { completeOnboarding } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { TRADE_LABELS, type Trade } from "@/types";
import { useState } from "react";

const tradeIcons: Record<Trade, string> = {
  painting:    "🎨",
  roofing:     "🏠",
  flooring:    "🪵",
  landscaping: "🌿",
  hvac:        "❄️",
  plumbing:    "🔧",
  electrical:  "⚡",
};

export default function OnboardingPage() {
  const [selected, setSelected] = useState<Trade | null>(null);
  const [state, action, pending] = useActionState(completeOnboarding, undefined);

  return (
    <main className="flex flex-1 flex-col min-h-screen bg-[#0F172A] px-6 py-12">
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div>
          <span className="text-2xl font-black tracking-tight text-white">
            task<span className="text-[#F97316]">rel</span>
          </span>
          <h1 className="mt-6 text-xl font-semibold text-white">What&apos;s your trade?</h1>
          <p className="mt-1 text-sm text-slate-400">
            This helps us generate accurate quotes for your work.
          </p>
        </div>

        <form action={action} className="space-y-6">
          <input type="hidden" name="trade" value={selected ?? ""} />

          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(TRADE_LABELS) as [Trade, string][]).map(([trade, label]) => (
              <button
                key={trade}
                type="button"
                onClick={() => setSelected(trade)}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all
                  ${selected === trade
                    ? "border-[#F97316] bg-[#F97316]/10 text-white"
                    : "border-slate-700 bg-[#1E293B] text-slate-300 hover:border-slate-500"
                  }`}
              >
                <span className="text-2xl">{tradeIcons[trade]}</span>
                {label}
              </button>
            ))}
          </div>

          {state?.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!selected}
            loading={pending}
          >
            Continue
          </Button>
        </form>
      </div>
    </main>
  );
}
