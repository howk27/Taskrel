"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Hammer,
  HouseLine,
  Lightning,
  PaintBrush,
  Tree,
  Wrench,
} from "@/components/ui/icons";
import { ReadinessList } from "@/components/ui/readiness";
import { completeOnboarding } from "@/lib/actions/auth";
import {
  getBillingReadiness,
  getBusinessReadiness,
  getOverheadReadiness,
  getQuoteDocumentReadiness,
} from "@/lib/readiness/setup-readiness";
import {
  BUSINESS_TYPE_LABELS,
  TRADE_LABELS,
  type BusinessType,
  type QuoteTemplatePreset,
  type Trade,
} from "@/types";
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

const presetOptions: {
  value: QuoteTemplatePreset;
  label: string;
  description: string;
}[] = [
  {
    value: "classic",
    label: "Classic",
    description: "Dark work-order style with a strong total block.",
  },
  {
    value: "modern",
    label: "Modern",
    description: "Bright invoice-style document with clear sender and client panels.",
  },
  {
    value: "compact",
    label: "Compact",
    description: "Short-form estimate with grouped scope and fewer columns.",
  },
];

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [licenseText, setLicenseText] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);
  const [primaryTrade, setPrimaryTrade] = useState<Trade | "">("");
  const [overheadEnabled, setOverheadEnabled] = useState(false);
  const [overheadPercent, setOverheadPercent] = useState("0");
  const [overheadFixed, setOverheadFixed] = useState("0");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [templatePreset, setTemplatePreset] =
    useState<QuoteTemplatePreset>("classic");
  const [quoteDefaultNote, setQuoteDefaultNote] = useState("");
  const [quoteDefaultTerms, setQuoteDefaultTerms] = useState("");
  const [quotePolicyText, setQuotePolicyText] = useState("");
  const [state, action, pending] = useActionState(completeOnboarding, undefined);

  const primaryOptions = useMemo(() => selectedTrades, [selectedTrades]);

  const readinessItems = useMemo(
    () => [
      getBusinessReadiness({
        business_name: businessName,
        business_type: businessType,
        trades: selectedTrades,
        primary_trade: primaryTrade,
      }),
      getOverheadReadiness({
        enabled: overheadEnabled,
        overhead_percent: overheadPercent,
        overhead_fixed_per_job: overheadFixed,
      }),
      getQuoteDocumentReadiness({
        quote_template_preset: templatePreset,
        logo_url: logoUrl,
        uploading: uploadingLogo,
        uploadError: logoError,
        business_phone: businessPhone,
        business_website: businessWebsite,
        license_text: licenseText,
        quote_default_terms: quoteDefaultTerms,
        quote_default_note: quoteDefaultNote,
        quote_policy_text: quotePolicyText,
      }),
      ...getBillingReadiness({
        subscription_status: null,
        stripe_connect_account_id: null,
        connectReturnState: null,
        billingConfigured: true,
        connectConfigured: true,
      }),
    ],
    [
      businessName,
      businessPhone,
      businessType,
      businessWebsite,
      licenseText,
      logoError,
      logoUrl,
      overheadEnabled,
      overheadFixed,
      overheadPercent,
      primaryTrade,
      quoteDefaultNote,
      quoteDefaultTerms,
      quotePolicyText,
      selectedTrades,
      templatePreset,
      uploadingLogo,
    ]
  );

  async function uploadLogo(file: File) {
    setLogoError("");
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/settings/logo", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setUploadingLogo(false);

    if (!response.ok) {
      setLogoError(data.error ?? "Logo upload failed.");
      return;
    }

    setLogoUrl(data.logo_url);
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
    <main className="min-h-screen bg-[#0F172A] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-slate-800 bg-[#172235] p-6 shadow-[0_20px_80px_rgba(15,23,42,0.45)]">
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)] lg:items-start">
            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                task<span className="text-[#F97316]">rel</span>
              </span>
              <h1 className="mt-5 text-3xl font-semibold text-white">
                Set up your workspace
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Add the business details Taskrel uses in quotes, pick your trade
                profile, and choose the defaults that make the first estimate feel
                ready on day one.
              </p>
            </div>

            <aside className="hidden rounded-2xl border border-slate-800 bg-[#0F172A] p-5 lg:sticky lg:top-6 lg:block">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Setup readiness
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This summary updates as you fill in each section.
              </p>
              <div className="mt-4">
                <ReadinessList items={readinessItems} />
              </div>
            </aside>
          </div>

          <form action={action} className="mt-8 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)] lg:gap-8">
            <div className="space-y-6">
              <input type="hidden" name="business_type" value={businessType} />
              <input type="hidden" name="primary_trade" value={primaryTrade} />
              <input type="hidden" name="logo_url" value={logoUrl} />

              <section className="rounded-2xl border border-slate-800 bg-[#0F172A] p-5">
                <SectionHeader
                  title="Business information"
                  description="These details appear on quote documents and keep your workspace identity consistent."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    name="business_name"
                    label="Business name"
                    value={businessName}
                    onChange={setBusinessName}
                    placeholder="Taskrel Painting Co."
                    required
                  />
                  <TextField
                    name="business_phone"
                    label="Business phone"
                    value={businessPhone}
                    onChange={setBusinessPhone}
                    placeholder="(305) 555-0100"
                  />
                  <TextField
                    name="business_website"
                    label="Website"
                    value={businessWebsite}
                    onChange={setBusinessWebsite}
                    placeholder="taskrel.com"
                  />
                  <TextField
                    name="license_text"
                    label="License / insured text"
                    value={licenseText}
                    onChange={setLicenseText}
                    placeholder="Licensed and insured in Florida"
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-[#0F172A] p-5">
                <SectionHeader
                  title="Trade profile"
                  description="Choose your contractor business type, then mark every trade you plan to quote through Taskrel."
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <div>
                    <p className="mb-3 text-sm font-medium text-slate-300">
                      Business type
                    </p>
                    <div className="grid gap-2">
                      {(Object.entries(BUSINESS_TYPE_LABELS) as [
                        BusinessType,
                        string,
                      ][]).map(([type, label]) => {
                        const IconComponent = businessTypeIcons[type];
                        const active = businessType === type;

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setBusinessType(type)}
                            className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                              active
                                ? "border-[#F97316] bg-[#F97316]/10 text-white"
                                : "border-slate-800 bg-[#172235] text-slate-300 hover:border-slate-600"
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <IconComponent
                                size={20}
                                weight={active ? "fill" : "regular"}
                                className={
                                  active ? "text-[#F97316]" : "text-slate-400"
                                }
                              />
                              <span className="text-sm font-semibold">{label}</span>
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wide">
                              {active ? "Selected" : "Select"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-medium text-slate-300">
                      Trades you offer
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(Object.entries(TRADE_LABELS) as [Trade, string][]).map(
                        ([trade, label]) => {
                          const IconComponent = tradeIcons[trade];
                          const active = selectedTrades.includes(trade);

                          return (
                            <button
                              key={trade}
                              type="button"
                              onClick={() => toggleTrade(trade)}
                              className={`flex min-h-24 flex-col justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                                active
                                  ? "border-[#F97316] bg-[#F97316]/10 text-white"
                                  : "border-slate-800 bg-[#172235] text-slate-300 hover:border-slate-600"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <IconComponent
                                  size={22}
                                  weight={active ? "fill" : "regular"}
                                  className={
                                    active ? "text-[#F97316]" : "text-slate-400"
                                  }
                                />
                                <span className="text-xs font-bold uppercase tracking-wide">
                                  {active ? "Selected" : "Select"}
                                </span>
                              </div>
                              <span className="text-sm font-semibold">{label}</span>
                            </button>
                          );
                        }
                      )}
                    </div>

                    {selectedTrades.map((trade) => (
                      <input key={trade} type="hidden" name="trades" value={trade} />
                    ))}

                    {primaryOptions.length > 0 && (
                      <label className="mt-4 block">
                        <span className="text-sm font-medium text-slate-300">
                          Primary AI quote trade
                        </span>
                        <select
                          id="primary_trade_select"
                          value={primaryTrade}
                          onChange={(event) =>
                            setPrimaryTrade(event.target.value as Trade)
                          }
                          className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-[#172235] px-3 py-2.5 text-sm font-medium text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]"
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
              </section>

              <section className="rounded-2xl border border-slate-800 bg-[#0F172A] p-5">
                <SectionHeader
                  title="Quote defaults"
                  description="Pick the default document style and the client-facing text that should be ready before your first quote."
                />

                <div>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">
                      Default quote template
                    </span>
                    <select
                      name="quote_template_preset"
                      value={templatePreset}
                      onChange={(event) =>
                        setTemplatePreset(
                          event.target.value as QuoteTemplatePreset
                        )
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-[#172235] px-3 py-2.5 text-sm text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    >
                      {presetOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {
                      presetOptions.find(
                        (option) => option.value === templatePreset
                      )?.description
                    }
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-[#111827] px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Quote logo</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Logo is optional. Upload one now or add it later in settings.
                      </p>
                    </div>
                    {logoUrl ? (
                      <div
                        aria-label="Current quote logo"
                        className="h-14 w-24 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat p-2"
                        style={{ backgroundImage: `url("${logoUrl.replace(/["\\\n\r]/g, "")}")` }}
                      />
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const file = event.dataTransfer.files.item(0);
                      if (file) void uploadLogo(file);
                    }}
                    disabled={uploadingLogo}
                    className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-[#F97316] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploadingLogo ? "Uploading logo..." : logoUrl ? "Replace logo" : "Upload optional logo"}
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.item(0);
                      if (file) void uploadLogo(file);
                    }}
                  />
                  {logoError && <p className="mt-2 text-sm text-red-300">{logoError}</p>}
                </div>

                <div className="mt-4 space-y-4">
                  <TextAreaField
                    name="quote_default_note"
                    label="Default client note"
                    value={quoteDefaultNote}
                    onChange={setQuoteDefaultNote}
                    placeholder="Thank you for the opportunity to quote this work."
                  />
                  <TextAreaField
                    name="quote_default_terms"
                    label="Default terms"
                    value={quoteDefaultTerms}
                    onChange={setQuoteDefaultTerms}
                    placeholder="Quote valid for 30 days. A deposit may be required before scheduling."
                  />
                  <TextAreaField
                    name="quote_policy_text"
                    label="Policies and warranty template"
                    value={quotePolicyText}
                    onChange={setQuotePolicyText}
                    placeholder="Workmanship warranty: 1 year. Scope changes require written approval."
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-[#0F172A] p-5">
                <SectionHeader
                  title="Internal overhead"
                  description="These costs stay internal and help Taskrel shape pricing recommendations."
                />

                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700 bg-[#172235] px-4 py-3">
                  <input
                    type="checkbox"
                    name="overhead_enabled"
                    checked={overheadEnabled}
                    onChange={(event) => setOverheadEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-[#111827] text-[#F97316] focus:ring-2 focus:ring-[#F97316]"
                  />
                  <span className="text-sm font-medium text-slate-200">
                    Add overhead to pricing
                  </span>
                </label>

                {!overheadEnabled && (
                  <>
                    <input type="hidden" name="overhead_percent" value="0" />
                    <input
                      type="hidden"
                      name="overhead_fixed_per_job"
                      value="0"
                    />
                  </>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <NumberField
                    name={overheadEnabled ? "overhead_percent" : undefined}
                    label="Default overhead percent"
                    value={overheadPercent}
                    onChange={setOverheadPercent}
                    min="0"
                    max="100"
                    step="0.001"
                    disabled={!overheadEnabled}
                  />
                  <NumberField
                    name={
                      overheadEnabled ? "overhead_fixed_per_job" : undefined
                    }
                    label="Fixed overhead per job"
                    value={overheadFixed}
                    onChange={setOverheadFixed}
                    min="0"
                    step="0.01"
                    disabled={!overheadEnabled}
                  />
                </div>
              </section>

              <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-5 lg:hidden">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Setup readiness
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This summary updates as you fill in each section.
                </p>
                <div className="mt-4">
                  <ReadinessList items={readinessItems} />
                </div>
              </div>

              {state?.error && (
                <p className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                  {state.error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  !businessName ||
                  !businessType ||
                  selectedTrades.length === 0 ||
                  !primaryTrade
                }
                loading={pending}
              >
                Save workspace setup
              </Button>
            </div>

            <div className="hidden lg:block" />
          </form>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function TextField({
  name,
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-[#172235] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]"
      />
    </label>
  );
}

function NumberField({
  name,
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: string;
  max?: string;
  step: string;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input
        name={name}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-700 bg-[#172235] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function TextAreaField({
  name,
  label,
  value,
  onChange,
  placeholder,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-slate-700 bg-[#172235] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#F97316]"
      />
    </label>
  );
}
