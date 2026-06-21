"use client";

import { useActionState, useMemo, useState } from "react";
import { completeOnboarding } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { BUSINESS_TYPE_LABELS, TRADE_LABELS, type BusinessType, type Trade } from "@/types";
import { Hammer, HouseLine, PaintBrush, Tree, Wrench, Lightning } from "@/components/ui/icons";
import type { Icon } from "@phosphor-icons/react";

const businessTypeIcons: Record<BusinessType, Icon> = {
  home_improvement: HouseLine,
  mechanical_services: Wrench,
  outdoor_services: Tree,
  general_contracting: Hammer,
  other: HouseLine,
};

const tradeIcons: Record<Trade, Icon> = {
  painting: PaintBrush,
  roofing: HouseLine,
  flooring: Hammer,
  landscaping: Tree,
  hvac: Wrench,
  plumbing: Wrench,
  electrical: Lightning,
};

export default function OnboardingPage() {
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);
  const [primaryTrade, setPrimaryTrade] = useState<Trade | "">("");
  const [state, action, pending] = useActionState(completeOnboarding, undefined);

  const primaryOptions = useMemo(() => selectedTrades, [selectedTrades]);

  function toggleTrade(trade: Trade) {
    setSelectedTrades((current) => {
      const next = current.includes(trade)
        ? current.filter((item) => item !== trade)
        : [...current, trade];

      if (!next.includes(primaryTrade as Trade)) {
        setPrimaryTrade(next[0] ?? "");
      }

      return next;
    });
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-[var(--tr-bg)] px-5 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5">
          <span className="text-2xl font-black tracking-tight text-white">
            task<span className="text-[var(--tr-orange)]">rel</span>
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-white">Set up your work profile</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Choose the kind of contractor business you run, then pick every trade you quote for.
          </p>
        </div>

        <form action={action} className="space-y-6">
          <input type="hidden" name="business_type" value={businessType} />
          <input type="hidden" name="primary_trade" value={primaryTrade} />

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Business type</h2>
            <div className="grid gap-2">
              {(Object.entries(BUSINESS_TYPE_LABELS) as [BusinessType, string][]).map(([type, label]) => {
                const IconComponent = businessTypeIcons[type];
                const active = businessType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBusinessType(type)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? "border-[var(--tr-orange)] bg-[var(--tr-orange)]/10 text-white"
                        : "border-[var(--tr-border-soft)] bg-[var(--tr-surface)] text-slate-300 hover:border-[var(--tr-border)]"
                    }`}
                  >
                    <IconComponent size={22} weight={active ? "fill" : "regular"} className={active ? "text-[var(--tr-orange)]" : "text-slate-400"} />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Trades you offer</h2>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TRADE_LABELS) as [Trade, string][]).map(([trade, label]) => {
                const IconComponent = tradeIcons[trade];
                const active = selectedTrades.includes(trade);
                return (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => toggleTrade(trade)}
                    className={`flex min-h-24 flex-col justify-between rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? "border-[var(--tr-orange)] bg-[var(--tr-orange)]/10 text-white"
                        : "border-[var(--tr-border-soft)] bg-[var(--tr-surface)] text-slate-300 hover:border-[var(--tr-border)]"
                    }`}
                  >
                    <IconComponent size={24} weight={active ? "fill" : "regular"} className={active ? "text-[var(--tr-orange)]" : "text-slate-400"} />
                    <span className="text-sm font-semibold">{label}</span>
                    {active && <input type="hidden" name="trades" value={trade} />}
                  </button>
                );
              })}
            </div>
          </section>

          {primaryOptions.length > 0 && (
            <section>
              <label htmlFor="primary_trade_select" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Primary AI quote trade
              </label>
              <select
                id="primary_trade_select"
                value={primaryTrade}
                onChange={(event) => setPrimaryTrade(event.target.value as Trade)}
                className="tr-input h-12 w-full rounded-lg px-3 text-sm font-medium"
              >
                {primaryOptions.map((trade) => (
                  <option key={trade} value={trade}>{TRADE_LABELS[trade]}</option>
                ))}
              </select>
            </section>
          )}

          {state?.error && <p className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{state.error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={!businessType || selectedTrades.length === 0 || !primaryTrade}
            loading={pending}
          >
            Continue
          </Button>
        </form>
      </div>
    </main>
  );
}
