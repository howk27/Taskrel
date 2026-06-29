"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Hammer,
  HouseLine,
  Lightning,
  PaintBrush,
  Tree,
  Wrench,
} from "@/components/ui/icons";
import { completeOnboarding } from "@/lib/actions/auth";
import {
  TRADE_LABELS,
  type BusinessType,
  type QuoteTemplatePreset,
  type Trade,
} from "@/types";
import type { Icon } from "@phosphor-icons/react";

type OnboardingStep = "business" | "trade" | "defaults" | "pricing";

const steps: { key: OnboardingStep; title: string; short: string }[] = [
  { key: "business", title: "Business", short: "Quote display details" },
  { key: "trade", title: "Services", short: "Work you quote" },
  { key: "defaults", title: "Quote defaults", short: "Reusable quote text" },
  { key: "pricing", title: "Pricing", short: "Internal overhead" },
];

const tradeIcons: Record<Trade, Icon> = {
  painting: PaintBrush,
  roofing: HouseLine,
  flooring: Hammer,
  landscaping: Tree,
  hvac: Wrench,
  plumbing: Wrench,
  electrical: Lightning,
};

const presetOptions: { value: QuoteTemplatePreset; label: string; detail: string }[] = [
  { value: "classic", label: "Standard", detail: "Polished, structured layout for complete professional quotes." },
  { value: "modern", label: "Refined", detail: "Whitespace-led, restrained layout for high-value work." },
  { value: "compact", label: "Compact", detail: "Practical, field-service layout for repeat or simple jobs." },
];

const starterTerms = "Quote valid for 30 days. A deposit may be required before scheduling. Scope changes require written approval.";
const starterPolicy = "Workmanship warranty: 1 year. Materials follow manufacturer warranty. Final payment is due when work is complete.";
const starterNote = "Thank you for the opportunity to quote this work. Reply with any questions before approval.";

export default function OnboardingPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [licenseText, setLicenseText] = useState("");
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);
  const [overheadEnabled, setOverheadEnabled] = useState(false);
  const [overheadPercent, setOverheadPercent] = useState("0");
  const [overheadFixed, setOverheadFixed] = useState("0");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [templatePreset, setTemplatePreset] = useState<QuoteTemplatePreset>("classic");
  const [quoteDefaultNote, setQuoteDefaultNote] = useState("");
  const [quoteDefaultTerms, setQuoteDefaultTerms] = useState("");
  const [quotePolicyText, setQuotePolicyText] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [activeStep, setActiveStep] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const current = steps[activeStep];
  const inferredBusinessType = inferBusinessType(selectedTrades);
  const fallbackPrimaryTrade = selectedTrades[0] ?? "";
  const completed = [
    Boolean(businessName.trim()),
    Boolean(selectedTrades.length > 0),
    Boolean(templatePreset),
    true,
  ];
  const requiredReady = completed[0] && completed[1] && completed[2];
  const progress = Math.round(((activeStep + 1) / steps.length) * 100);

  async function uploadLogo(file: File) {
    setLogoError("");
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/settings/logo", { method: "POST", body: formData });
    const data = await response.json();
    setUploadingLogo(false);

    if (!response.ok) {
      setLogoError(data.error ?? "Logo upload failed.");
      return;
    }

    setLogoUrl(data.logo_url);
  }

  function toggleTrade(trade: Trade) {
    setSelectedTrades((currentTrades) => {
      const next = currentTrades.includes(trade)
        ? currentTrades.filter((item) => item !== trade)
        : [...currentTrades, trade];

      return next;
    });
  }

  function goNext() {
    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goBack() {
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  function handleBack() {
    if (activeStep > 0) {
      goBack();
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[var(--tr-bg)] text-[var(--tr-text)]">
      <form action={action} className="mx-auto flex min-h-[100dvh] max-w-4xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <HiddenFields
          businessName={businessName}
          businessPhone={businessPhone}
          businessWebsite={businessWebsite}
          licenseText={licenseText}
          businessType={inferredBusinessType}
          selectedTrades={selectedTrades}
          primaryTrade={fallbackPrimaryTrade}
          overheadEnabled={overheadEnabled}
          overheadPercent={overheadPercent}
          overheadFixed={overheadFixed}
          logoUrl={logoUrl}
          templatePreset={templatePreset}
          quoteDefaultNote={quoteDefaultNote}
          quoteDefaultTerms={quoteDefaultTerms}
          quotePolicyText={quotePolicyText}
        />

        <section className="flex flex-col">
          <div className="sticky top-0 z-20 -mx-5 bg-[var(--tr-bg)]/96 px-5 pb-4 pt-1 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]"
              >
                <ArrowLeft size={18} weight="bold" />
                Back
              </button>
              <span className="hidden text-2xl font-semibold tracking-tight sm:inline">
                task<span className="text-[var(--tr-orange)]">rel</span>
              </span>
              <p className="text-sm font-medium text-[var(--tr-text-muted)]">
                Step {activeStep + 1} of {steps.length}
              </p>
            </div>
            <OnboardingTopProgress
              activeIndex={activeStep}
              completed={completed}
              progress={progress}
              onSelect={setActiveStep}
            />
          </div>

          <div className="mt-7">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--tr-text)] sm:text-4xl">
                {headlineFor(current.key)}
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[var(--tr-text-muted)]">
                {descriptionFor(current.key)}
              </p>
            </div>

            <div className="mt-8 max-w-2xl">
              {current.key === "business" && (
                <BusinessStep
                  businessName={businessName}
                  businessPhone={businessPhone}
                  businessWebsite={businessWebsite}
                  licenseText={licenseText}
                  logoUrl={logoUrl}
                  uploadingLogo={uploadingLogo}
                  logoError={logoError}
                  logoInputRef={logoInputRef}
                  setBusinessName={setBusinessName}
                  setBusinessPhone={setBusinessPhone}
                  setBusinessWebsite={setBusinessWebsite}
                  setLicenseText={setLicenseText}
                  uploadLogo={uploadLogo}
                />
              )}

              {current.key === "trade" && (
                <TradeStep
                  selectedTrades={selectedTrades}
                  toggleTrade={toggleTrade}
                />
              )}

              {current.key === "defaults" && (
                <DefaultsStep
                  templatePreset={templatePreset}
                  quoteDefaultNote={quoteDefaultNote}
                  quoteDefaultTerms={quoteDefaultTerms}
                  quotePolicyText={quotePolicyText}
                  showPreview={showPreview}
                  setTemplatePreset={setTemplatePreset}
                  setQuoteDefaultNote={setQuoteDefaultNote}
                  setQuoteDefaultTerms={setQuoteDefaultTerms}
                  setQuotePolicyText={setQuotePolicyText}
                  setShowPreview={setShowPreview}
                  businessName={businessName}
                  businessPhone={businessPhone}
                  businessWebsite={businessWebsite}
                  licenseText={licenseText}
                  logoUrl={logoUrl}
                />
              )}

              {current.key === "pricing" && (
                <PricingStep
                  overheadEnabled={overheadEnabled}
                  overheadPercent={overheadPercent}
                  overheadFixed={overheadFixed}
                  setOverheadEnabled={setOverheadEnabled}
                  setOverheadPercent={setOverheadPercent}
                  setOverheadFixed={setOverheadFixed}
                />
              )}
            </div>
          </div>

          {state?.error && (
            <p className="mt-6 max-w-2xl rounded-lg bg-[var(--tr-error-bg)] px-4 py-3 text-sm text-[var(--tr-red)] shadow-[inset_0_0_0_1px_var(--tr-badge-error-ring)]">
              {state.error}
            </p>
          )}

          <div className="mt-6 flex max-w-2xl flex-col gap-3 border-t border-[var(--tr-border-soft)] pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]"
            >
              <ArrowLeft size={17} weight="bold" />
              Back
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              {activeStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={(current.key === "business" && !completed[0]) || (current.key === "trade" && !completed[1])}
                  className="tr-accent-action inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-45"
                >
                  Continue
                  <ArrowRight size={17} weight="bold" />
                </button>
              ) : (
                <Button type="submit" loading={pending} disabled={!requiredReady} className="min-w-44 tr-accent-action">
                  Create workspace
                </Button>
              )}
            </div>
          </div>
        </section>
      </form>
    </main>
  );
}

function OnboardingTopProgress({
  activeIndex,
  completed,
  progress,
  onSelect,
}: {
  activeIndex: number;
  completed: boolean[];
  progress: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mt-5 border-t border-[var(--tr-border-soft)] pt-4">
      <div className="h-1.5 rounded-sm bg-[var(--tr-surface-2)]">
        <div className="h-full rounded-sm bg-[var(--tr-orange)] transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {steps.map((step, index) => {
          const done = completed[index];
          const current = index === activeIndex;
          const enabled = index <= activeIndex || completed.slice(0, index).every(Boolean);

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => {
                if (enabled) onSelect(index);
              }}
              disabled={!enabled}
              aria-current={current ? "step" : undefined}
              className={`flex min-w-36 items-center justify-center gap-2 rounded-lg px-3 py-2 text-left transition-colors shadow-[inset_0_0_0_1px_var(--tr-border-soft)] ${
                current
                  ? "bg-[var(--tr-primary-fill)] text-[var(--tr-text)]"
                  : done
                    ? "bg-[var(--tr-bg-soft)] text-[var(--tr-text)] hover:bg-[var(--tr-surface-2)]"
                    : "bg-[var(--tr-bg-soft)] text-[var(--tr-text-muted)]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {done ? (
                <CheckCircle size={17} weight="duotone" className="shrink-0 text-[var(--tr-green)]" />
              ) : (
                <div className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[var(--tr-surface)] text-sm font-semibold text-[var(--tr-text-faint)]">
                  {index + 1}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{step.title}</p>
                <p className="truncate text-sm text-[var(--tr-text-faint)]">{step.short}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HiddenFields({
  businessName,
  businessPhone,
  businessWebsite,
  licenseText,
  businessType,
  selectedTrades,
  primaryTrade,
  overheadEnabled,
  overheadPercent,
  overheadFixed,
  logoUrl,
  templatePreset,
  quoteDefaultNote,
  quoteDefaultTerms,
  quotePolicyText,
}: {
  businessName: string;
  businessPhone: string;
  businessWebsite: string;
  licenseText: string;
  businessType: BusinessType | "";
  selectedTrades: Trade[];
  primaryTrade: Trade | "";
  overheadEnabled: boolean;
  overheadPercent: string;
  overheadFixed: string;
  logoUrl: string;
  templatePreset: QuoteTemplatePreset;
  quoteDefaultNote: string;
  quoteDefaultTerms: string;
  quotePolicyText: string;
}) {
  return (
    <>
      <input type="hidden" name="business_name" value={businessName} />
      <input type="hidden" name="business_phone" value={businessPhone} />
      <input type="hidden" name="business_website" value={businessWebsite} />
      <input type="hidden" name="license_text" value={licenseText} />
      <input type="hidden" name="business_type" value={businessType} />
      <input type="hidden" name="primary_trade" value={primaryTrade} />
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="quote_template_preset" value={templatePreset} />
      <input type="hidden" name="quote_default_note" value={quoteDefaultNote} />
      <input type="hidden" name="quote_default_terms" value={quoteDefaultTerms} />
      <input type="hidden" name="quote_policy_text" value={quotePolicyText} />
      <input type="hidden" name="overhead_enabled" value={overheadEnabled ? "on" : ""} />
      <input type="hidden" name="overhead_percent" value={overheadPercent} />
      <input type="hidden" name="overhead_fixed_per_job" value={overheadFixed} />
      {selectedTrades.map((trade) => (
        <input key={trade} type="hidden" name="trades" value={trade} />
      ))}
    </>
  );
}

function BusinessStep({
  businessName,
  businessPhone,
  businessWebsite,
  licenseText,
  logoUrl,
  uploadingLogo,
  logoError,
  logoInputRef,
  setBusinessName,
  setBusinessPhone,
  setBusinessWebsite,
  setLicenseText,
  uploadLogo,
}: {
  businessName: string;
  businessPhone: string;
  businessWebsite: string;
  licenseText: string;
  logoUrl: string;
  uploadingLogo: boolean;
  logoError: string;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  setBusinessName: (value: string) => void;
  setBusinessPhone: (value: string) => void;
  setBusinessWebsite: (value: string) => void;
  setLicenseText: (value: string) => void;
  uploadLogo: (file: File) => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      <TextField
        label="Business name"
        value={businessName}
        onChange={setBusinessName}
        placeholder="Taskrel Painting Co."
        autoFocus
      />

      <div className="rounded-lg bg-[var(--tr-warning-bg)] p-4 shadow-[inset_0_0_0_1px_var(--tr-badge-warning-ring)]">
        <p className="text-sm font-semibold text-[var(--tr-text)]">Shown on quote documents</p>
        <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">
          Phone, website, license text, and logo can appear on quotes. Leave anything empty if you do not want it shown for now.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Business phone" value={businessPhone} onChange={setBusinessPhone} placeholder="(305) 555-0100" />
        <TextField label="Website" value={businessWebsite} onChange={setBusinessWebsite} placeholder="taskrel.com" />
      </div>
      <TextField label="License or trust line" value={licenseText} onChange={setLicenseText} placeholder="Licensed and insured in Florida" />

      <div className="rounded-lg bg-[var(--tr-surface)] p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--tr-text)]">Logo</p>
            <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">Optional. Add it now or later in settings.</p>
          </div>
          {logoUrl ? (
            <div
              aria-label="Current quote logo"
              className="h-14 w-24 shrink-0 rounded-lg bg-white bg-contain bg-center bg-no-repeat"
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
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--tr-border)] px-4 py-3 text-sm font-semibold text-[var(--tr-text)] transition-colors hover:bg-[var(--tr-surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
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
        {logoError && <p className="mt-2 text-sm text-[var(--tr-red)]">{logoError}</p>}
      </div>
    </div>
  );
}

function TradeStep({
  selectedTrades,
  toggleTrade,
}: {
  selectedTrades: Trade[];
  toggleTrade: (trade: Trade) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(Object.entries(TRADE_LABELS) as [Trade, string][]).map(([trade, label]) => {
          const IconComponent = tradeIcons[trade];
          const active = selectedTrades.includes(trade);
          return (
            <button
              key={trade}
              type="button"
              onClick={() => toggleTrade(trade)}
              className={`flex min-h-14 items-center justify-between gap-3 rounded-lg px-4 text-left transition-colors shadow-[inset_0_0_0_1px_var(--tr-border-soft)] ${
                active ? "bg-[var(--tr-primary-fill)] text-[var(--tr-text)]" : "bg-[var(--tr-surface)] text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-2)]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <IconComponent size={22} weight={active ? "fill" : "regular"} className={active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"} />
                <span className="truncate text-sm font-semibold">{label}</span>
              </span>
              {active && <CheckCircle size={18} weight="duotone" className="shrink-0 text-[var(--tr-green)]" />}
            </button>
          );
        })}
      </div>

      <p className="text-sm leading-6 text-[var(--tr-text-muted)]">
        You will choose the exact service again when creating each quote.
      </p>
    </div>
  );
}

function DefaultsStep({
  templatePreset,
  quoteDefaultNote,
  quoteDefaultTerms,
  quotePolicyText,
  showPreview,
  setTemplatePreset,
  setQuoteDefaultNote,
  setQuoteDefaultTerms,
  setQuotePolicyText,
  setShowPreview,
  businessName,
  businessPhone,
  businessWebsite,
  licenseText,
  logoUrl,
}: {
  templatePreset: QuoteTemplatePreset;
  quoteDefaultNote: string;
  quoteDefaultTerms: string;
  quotePolicyText: string;
  showPreview: boolean;
  setTemplatePreset: (value: QuoteTemplatePreset) => void;
  setQuoteDefaultNote: (value: string) => void;
  setQuoteDefaultTerms: (value: string) => void;
  setQuotePolicyText: (value: string) => void;
  setShowPreview: (value: boolean) => void;
  businessName: string;
  businessPhone: string;
  businessWebsite: string;
  licenseText: string;
  logoUrl: string;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-[var(--tr-surface)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--tr-text)]">Quote mode</p>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex h-8 items-center rounded-md border border-[var(--tr-border)] px-3 text-sm font-semibold text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]"
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {presetOptions.map((option) => {
            const active = templatePreset === option.value;
            return (
              <button
                key={option.value}
                type="button"
                title={option.detail}
                onClick={() => setTemplatePreset(option.value)}
                className={`h-10 rounded-md px-2 text-sm font-semibold transition-colors shadow-[inset_0_0_0_1px_var(--tr-border-soft)] ${
                  active
                    ? "bg-[var(--tr-primary-fill)] text-[var(--tr-text)]"
                    : "bg-[var(--tr-bg-soft)] text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {showPreview && (
        <QuotePreview
          businessName={businessName}
          businessPhone={businessPhone}
          businessWebsite={businessWebsite}
          licenseText={licenseText}
          logoUrl={logoUrl}
          note={quoteDefaultNote}
          policy={quotePolicyText}
          preset={templatePreset}
          terms={quoteDefaultTerms}
        />
      )}

      <TextAreaField label="Default client note" value={quoteDefaultNote} onChange={setQuoteDefaultNote} placeholder={starterNote} />
      <TextAreaField label="Default terms" value={quoteDefaultTerms} onChange={setQuoteDefaultTerms} placeholder={starterTerms} />
      <TextAreaField label="Policies and warranty" value={quotePolicyText} onChange={setQuotePolicyText} placeholder={starterPolicy} />
    </div>
  );
}

function PricingStep({
  overheadEnabled,
  overheadPercent,
  overheadFixed,
  setOverheadEnabled,
  setOverheadPercent,
  setOverheadFixed,
}: {
  overheadEnabled: boolean;
  overheadPercent: string;
  overheadFixed: string;
  setOverheadEnabled: (value: boolean) => void;
  setOverheadPercent: (value: string) => void;
  setOverheadFixed: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="flex min-h-14 items-center gap-3 rounded-lg bg-[var(--tr-surface)] px-4 py-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <input
          type="checkbox"
          checked={overheadEnabled}
          onChange={(event) => setOverheadEnabled(event.target.checked)}
          className="h-4 w-4 rounded border-[var(--tr-border)] bg-[var(--tr-bg-soft)] text-[var(--tr-primary)] focus:ring-2 focus:ring-[var(--tr-primary)]"
        />
        <span>
          <span className="block text-sm font-semibold text-[var(--tr-text)]">Add overhead defaults</span>
          <span className="mt-1 block text-sm leading-6 text-[var(--tr-text-muted)]">Internal only. Clients will not see this math.</span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Overhead percent" value={overheadPercent} onChange={setOverheadPercent} min="0" max="100" step="0.001" disabled={!overheadEnabled} />
        <NumberField label="Fixed overhead per job" value={overheadFixed} onChange={setOverheadFixed} min="0" step="0.01" disabled={!overheadEnabled} />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--tr-text)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="tr-input mt-2 min-h-12 w-full rounded-lg px-3 py-2.5 text-base focus:outline-none"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
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
      <span className="text-sm font-semibold text-[var(--tr-text)]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="tr-input mt-2 min-h-12 w-full rounded-lg px-3 py-2.5 text-base focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--tr-text)]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="tr-input mt-2 min-h-28 w-full resize-none rounded-lg px-3 py-2.5 text-sm leading-6 focus:outline-none"
      />
    </label>
  );
}

function QuotePreview({
  businessName,
  businessPhone,
  businessWebsite,
  licenseText,
  logoUrl,
  note,
  policy,
  preset,
  terms,
}: {
  businessName: string;
  businessPhone: string;
  businessWebsite: string;
  licenseText: string;
  logoUrl: string;
  note: string;
  policy: string;
  preset: QuoteTemplatePreset;
  terms: string;
}) {
  const title = businessName || "Your Business Co.";
  const contact = [businessPhone || "(305) 555-0100", businessWebsite || "yourcompany.com"].filter(Boolean).join(" | ");
  const surfaceClass = preset === "classic" ? "bg-[#0b1220] text-white" : preset === "modern" ? "bg-white text-[#111827]" : "bg-[#f8fafc] text-[#111827]";

  return (
    <div className={`rounded-lg p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,.28)] ${surfaceClass}`}>
      <div className="flex items-start justify-between gap-4 border-b border-current/15 pb-4">
        <div className="min-w-0">
          {logoUrl ? (
            <div
              aria-label="Quote logo preview"
              className="mb-3 h-12 w-24 rounded-md bg-white bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${logoUrl.replace(/["\\\n\r]/g, "")}")` }}
            />
          ) : (
            <div className="mb-3 grid h-12 w-24 place-items-center rounded-md border border-dashed border-current/35 text-sm font-semibold text-current/70">
              Logo
            </div>
          )}
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm text-current/65">{licenseText || "Licensed and insured"}</p>
          <p className="mt-1 text-sm text-current/65">{contact}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-current/65">Estimate total</p>
          <p className="mt-1 text-2xl font-semibold">$4,820</p>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-4 border-b border-current/12 pb-3">
          <span>Prep, primer, cabinet finish</span>
          <strong>$3,840</strong>
        </div>
        <div className="flex justify-between gap-4 border-b border-current/12 pb-3">
          <span>Frame painting and reassembly</span>
          <strong>$980</strong>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-current/[0.06] p-3">
          <p className="font-semibold">Client note</p>
          <p className="mt-1 leading-5 text-current/70">{note || starterNote}</p>
        </div>
        <div className="rounded-md bg-current/[0.06] p-3">
          <p className="font-semibold">Terms</p>
          <p className="mt-1 leading-5 text-current/70">{terms || starterTerms}</p>
        </div>
      </div>

      <div className="mt-3 rounded-md bg-current/[0.06] p-3 text-sm">
        <p className="font-semibold">Policies and warranty</p>
        <p className="mt-1 leading-5 text-current/70">{policy || starterPolicy}</p>
      </div>
    </div>
  );
}

function headlineFor(step: OnboardingStep) {
  if (step === "business") return "Let’s set up the quote workspace.";
  if (step === "trade") return "Select the services you quote.";
  if (step === "defaults") return "Choose how quotes should read.";
  return "Add pricing rules if you use them.";
}

function descriptionFor(step: OnboardingStep) {
  if (step === "business") return "Start with the business name and any quote-facing details you want clients to see.";
  if (step === "trade") return "Pick every service you offer. The exact quote service is selected when creating a quote.";
  if (step === "defaults") return "Set reusable quote language once so new quotes start closer to finished.";
  return "Overhead is optional. Add it only if you want Taskrel to account for internal job costs.";
}

function inferBusinessType(trades: Trade[]): BusinessType {
  if (trades.some((trade) => trade === "hvac" || trade === "plumbing" || trade === "electrical")) return "mechanical_services";
  if (trades.includes("landscaping")) return "outdoor_services";
  if (trades.some((trade) => trade === "painting" || trade === "roofing" || trade === "flooring")) return "home_improvement";
  return "general_contracting";
}
