"use client";

import { useActionState, useMemo, useState } from "react";
import { ReadinessSectionHeader } from "@/components/ui/readiness";
import { updateBusinessInformation, type SettingsActionState } from "@/lib/actions/settings";
import { getBusinessReadiness } from "@/lib/readiness/setup-readiness";
import { BUSINESS_TYPE_LABELS, TRADE_LABELS, type BusinessType, type Contractor, type Trade } from "@/types";

type Props = {
  contractor: Pick<
    Contractor,
    | "business_name"
    | "business_type"
    | "trade"
    | "primary_trade"
    | "trades"
    | "business_phone"
    | "business_website"
    | "license_text"
  >;
};

export function BusinessInformationForm({ contractor }: Props) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    updateBusinessInformation,
    undefined
  );
  const [businessName, setBusinessName] = useState(contractor.business_name);
  const [businessType, setBusinessType] = useState<BusinessType | "">(contractor.business_type ?? "");
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>(
    contractor.trades?.length ? contractor.trades : contractor.trade ? [contractor.trade] : []
  );
  const initialTrades = contractor.trades?.length ? contractor.trades : contractor.trade ? [contractor.trade] : [];
  const [primaryTrade, setPrimaryTrade] = useState<Trade | "">(
    contractor.primary_trade ?? contractor.trade ?? initialTrades[0] ?? ""
  );
  const readiness = getBusinessReadiness({
    business_name: businessName,
    business_type: businessType,
    trades: selectedTrades,
    primary_trade: primaryTrade,
  });
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
    <form
      action={formAction}
      className="rounded-lg bg-[var(--tr-surface)] p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]"
    >
      <ReadinessSectionHeader
        title="Business information"
        subtitle="This appears on quote documents and powers trade-specific quote generation."
        item={readiness}
      />

      <input type="hidden" name="business_type" value={businessType} />
      <input type="hidden" name="primary_trade" value={primaryTrade} />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">Business name</span>
          <input
            name="business_name"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">Business phone</span>
          <input
            name="business_phone"
            defaultValue={contractor.business_phone ?? ""}
            className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">Website</span>
          <input
            name="business_website"
            defaultValue={contractor.business_website ?? ""}
            className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">License / insured text</span>
          <input
            name="license_text"
            defaultValue={contractor.license_text ?? ""}
            className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--tr-text-muted)]">Business type</p>
          <div className="grid gap-2">
            {(Object.entries(BUSINESS_TYPE_LABELS) as [BusinessType, string][]).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => setBusinessType(type)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                  businessType === type
                    ? "border-[var(--tr-primary-edge)] bg-[var(--tr-primary-fill)] text-[var(--tr-primary)]"
                    : "border-[var(--tr-border-soft)] text-[var(--tr-text-muted)]"
                }`}
              >
                {label}
                {businessType === type && <span className="ml-2 text-xs font-bold">Selected</span>}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--tr-text-muted)]">Trades</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(TRADE_LABELS) as [Trade, string][]).map(([trade, label]) => {
              const active = selectedTrades.includes(trade);
              return (
                <button
                  key={trade}
                  type="button"
                  onClick={() => toggleTrade(trade)}
                  className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                    active
                      ? "border-[var(--tr-primary-edge)] bg-[var(--tr-primary-fill)] text-[var(--tr-primary)]"
                      : "border-[var(--tr-border-soft)] text-[var(--tr-text-muted)]"
                  }`}
                >
                  {label}
                  {active && <span className="ml-2 text-xs font-bold">Selected</span>}
                </button>
              );
            })}
          </div>
          {selectedTrades.map((trade) => (
            <input key={trade} type="hidden" name="trades" value={trade} />
          ))}
          {primaryOptions.length > 0 && (
            <label className="mt-3 block">
              <span className="text-sm font-medium text-[var(--tr-text-muted)]">Primary quote trade</span>
              <select
                value={primaryTrade}
                onChange={(event) => setPrimaryTrade(event.target.value as Trade)}
                className="tr-input mt-1.5 min-h-11 w-full rounded-lg px-3 py-2.5 text-sm"
              >
                {primaryOptions.map((trade) => (
                  <option key={trade} value={trade}>
                    {TRADE_LABELS[trade]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {state?.error && <p className="mt-3 text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="mt-3 text-sm text-emerald-400">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 min-h-11 w-full rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#EA6C0A] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save business information"}
      </button>
    </form>
  );
}
