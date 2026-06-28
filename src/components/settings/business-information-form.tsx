"use client";

import { useActionState, useState } from "react";
import { ReadinessSectionHeader } from "@/components/ui/readiness";
import { updateBusinessInformation, type SettingsActionState } from "@/lib/actions/settings";
import { getBusinessReadiness } from "@/lib/readiness/setup-readiness";
import { TRADE_LABELS, type BusinessType, type Contractor, type Trade } from "@/types";

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
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>(
    contractor.trades?.length ? contractor.trades : contractor.trade ? [contractor.trade] : []
  );
  const businessType = inferBusinessType(selectedTrades);
  const fallbackTrade = selectedTrades[0] ?? "";
  const readiness = getBusinessReadiness({
    business_name: businessName,
    business_type: businessType,
    trades: selectedTrades,
    primary_trade: fallbackTrade,
  });

  function toggleTrade(trade: Trade) {
    setSelectedTrades((current) => {
      return current.includes(trade)
        ? current.filter((item) => item !== trade)
        : [...current, trade];
    });
  }

  return (
    <form
      action={formAction}
      className="rounded-lg bg-[var(--tr-surface)] p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]"
    >
      <ReadinessSectionHeader
        title="Business information"
        subtitle="Used for quote documents and service-specific quoting."
        item={readiness}
      />

      <input type="hidden" name="business_type" value={businessType} />
      <input type="hidden" name="primary_trade" value={fallbackTrade} />

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

      <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-[var(--tr-text-muted)]">Services</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
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
                </button>
              );
            })}
          </div>
          {selectedTrades.map((trade) => (
            <input key={trade} type="hidden" name="trades" value={trade} />
          ))}
      </div>

      {state?.error && <p className="mt-3 text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="mt-3 text-sm text-emerald-400">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="tr-primary-action mt-4 min-h-11 w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save business information"}
      </button>
    </form>
  );
}

function inferBusinessType(trades: Trade[]): BusinessType {
  if (trades.some((trade) => trade === "hvac" || trade === "plumbing" || trade === "electrical")) return "mechanical_services";
  if (trades.includes("landscaping")) return "outdoor_services";
  if (trades.some((trade) => trade === "painting" || trade === "roofing" || trade === "flooring")) return "home_improvement";
  return "general_contracting";
}
