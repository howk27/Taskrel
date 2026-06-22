"use client";

import { useActionState, useMemo, useState } from "react";
import { completeOnboarding } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { BUSINESS_TYPE_LABELS, TRADE_LABELS, type BusinessType, type Trade } from "@/types";
import { ArrowLeft, CaretRight, CheckCircle, Hammer, HouseLine, PaintBrush, Tree, Wrench, Lightning } from "@/components/ui/icons";
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

const steps = [
  { key: "business", label: "Business" },
  { key: "trades", label: "Trades" },
  { key: "primary", label: "Default quote" },
] as const;

type StepKey = typeof steps[number]["key"];

export default function OnboardingPage() {
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);
  const [primaryTrade, setPrimaryTrade] = useState<Trade | "">("");
  const [step, setStep] = useState<StepKey>("business");
  const [state, action, pending] = useActionState(completeOnboarding, undefined);

  const primaryOptions = useMemo(() => selectedTrades, [selectedTrades]);
  const currentStepIndex = steps.findIndex(item => item.key === step);
  const isFinalStep = step === "primary";
  const canContinue =
    (step === "business" && Boolean(businessType)) ||
    (step === "trades" && selectedTrades.length > 0) ||
    (step === "primary" && Boolean(primaryTrade));

  function goNext() {
    if (!canContinue || isFinalStep) return;
    setStep(steps[currentStepIndex + 1].key);
  }

  function goBack() {
    if (currentStepIndex === 0) return;
    setStep(steps[currentStepIndex - 1].key);
  }

  function chooseBusiness(type: BusinessType) {
    setBusinessType(type);
    setStep("trades");
  }

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
    <main className="flex min-h-screen flex-1 bg-[var(--tr-bg)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-lg border border-[var(--tr-border)] bg-[var(--tr-surface)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <span className="text-2xl font-black tracking-tight text-white">
            task<span className="text-[var(--tr-primary)]">rel</span>
          </span>
          <h1 className="mt-6 text-3xl font-black tracking-tight text-white">Set up Taskrel for your work</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--tr-text-muted)]">
            Three quick choices so quotes start with the right trade defaults.
          </p>

          <div className="mt-6 space-y-3">
            {steps.map((item, index) => {
              const complete =
                (item.key === "business" && Boolean(businessType)) ||
                (item.key === "trades" && selectedTrades.length > 0) ||
                (item.key === "primary" && Boolean(primaryTrade));
              const active = item.key === step;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (index <= currentStepIndex || complete) setStep(item.key);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? "border-[var(--tr-primary)] bg-[var(--tr-primary)]/10 text-white"
                      : "border-[var(--tr-border)] bg-[var(--tr-surface-2)] text-[var(--tr-text-muted)]"
                  }`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${
                    complete ? "bg-emerald-500/15 text-emerald-200" : "bg-[var(--tr-bg-soft)] text-[var(--tr-text-muted)]"
                  }`}>
                    {complete ? <CheckCircle size={17} weight="fill" /> : index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{item.label}</span>
                    <span className="block text-xs text-[var(--tr-text-faint)]">
                      {item.key === "business" && (businessType ? BUSINESS_TYPE_LABELS[businessType] : "Choose company type")}
                      {item.key === "trades" && (selectedTrades.length ? `${selectedTrades.length} selected` : "Pick services")}
                      {item.key === "primary" && (primaryTrade ? TRADE_LABELS[primaryTrade] : "Set quote default")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <form action={action} className="rounded-lg border border-[var(--tr-border)] bg-[var(--tr-surface)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6">
          <input type="hidden" name="business_type" value={businessType} />
          <input type="hidden" name="primary_trade" value={primaryTrade} />
          {selectedTrades.map(trade => (
            <input key={trade} type="hidden" name="trades" value={trade} />
          ))}

          {step === "business" && (
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">Step 1</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">What kind of contracting business is this?</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--tr-text-muted)]">
                This tunes the language and defaults Taskrel uses around jobs, quotes, and follow-up.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(Object.entries(BUSINESS_TYPE_LABELS) as [BusinessType, string][]).map(([type, label]) => {
                  const IconComponent = businessTypeIcons[type];
                  const active = businessType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => chooseBusiness(type)}
                      className={`flex min-h-28 flex-col justify-between rounded-lg border p-4 text-left transition-colors ${
                        active
                          ? "border-[var(--tr-primary)] bg-[var(--tr-primary)]/10 text-white"
                          : "border-[var(--tr-border)] bg-[var(--tr-surface-2)] text-[var(--tr-text-muted)] hover:border-[var(--tr-border-strong)] hover:text-white"
                      }`}
                    >
                      <IconComponent size={26} weight={active ? "fill" : "duotone"} className={active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"} />
                      <span className="text-sm font-bold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === "trades" && (
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">Step 2</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Which trades do you quote for?</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--tr-text-muted)]">
                Select every service you offer. You can adjust this later in settings.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                {(Object.entries(TRADE_LABELS) as [Trade, string][]).map(([trade, label]) => {
                  const IconComponent = tradeIcons[trade];
                  const active = selectedTrades.includes(trade);
                  return (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => toggleTrade(trade)}
                      className={`flex min-h-28 flex-col justify-between rounded-lg border p-4 text-left transition-colors ${
                        active
                          ? "border-[var(--tr-primary)] bg-[var(--tr-primary)]/10 text-white"
                          : "border-[var(--tr-border)] bg-[var(--tr-surface-2)] text-[var(--tr-text-muted)] hover:border-[var(--tr-border-strong)] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <IconComponent size={25} weight={active ? "fill" : "duotone"} className={active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"} />
                        {active && <CheckCircle size={18} weight="fill" className="text-emerald-200" />}
                      </div>
                      <span className="text-sm font-bold">{label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--tr-text-muted)]">
                {selectedTrades.length ? `${selectedTrades.length} trade${selectedTrades.length === 1 ? "" : "s"} selected` : "Select at least one trade to continue."}
              </p>
            </section>
          )}

          {step === "primary" && (
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">Step 3</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Which trade should new quotes default to?</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--tr-text-muted)]">
                Pick the trade you quote most often. This becomes the first option in new quote workflows.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {primaryOptions.map((trade) => {
                  const IconComponent = tradeIcons[trade];
                  const active = primaryTrade === trade;
                  return (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => setPrimaryTrade(trade)}
                      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                        active
                          ? "border-[var(--tr-primary)] bg-[var(--tr-primary)]/10 text-white"
                          : "border-[var(--tr-border)] bg-[var(--tr-surface-2)] text-[var(--tr-text-muted)] hover:border-[var(--tr-border-strong)] hover:text-white"
                      }`}
                    >
                      <IconComponent size={24} weight={active ? "fill" : "duotone"} className={active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"} />
                      <span className="min-w-0 flex-1 text-sm font-bold">{TRADE_LABELS[trade]}</span>
                      {active && <CheckCircle size={18} weight="fill" className="text-emerald-200" />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {state?.error && <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{state.error}</p>}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--tr-border)] pt-5">
            <Button type="button" variant="ghost" onClick={goBack} disabled={currentStepIndex === 0 || pending}>
              <ArrowLeft size={17} weight="bold" />
              Back
            </Button>
            {isFinalStep ? (
              <Button type="submit" disabled={!canContinue} loading={pending}>
                Finish setup
              </Button>
            ) : (
              <Button type="button" onClick={goNext} disabled={!canContinue || pending}>
                Continue
                <CaretRight size={17} weight="bold" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
