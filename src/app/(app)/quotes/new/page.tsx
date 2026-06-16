"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Lightning, Plus } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import type { PricingRecommendationSnapshot, PropertyValuationSnapshot, QuoteAssistantMetadata, QuoteLineItem } from "@/types";
import { calculateQuotePricing, determineQuotePricingSource } from "@/lib/pricing";
import { formatCurrency } from "@/lib/format";

type Step = "form" | "generating" | "review";

interface GeneratedQuote extends QuoteAssistantMetadata {
  line_items: (QuoteLineItem & { unit?: string })[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  pricing_source?: string;
  pricing_confidence?: string | null;
  property_valuation_snapshot?: PropertyValuationSnapshot | null;
  pricing_recommendation_snapshot?: PricingRecommendationSnapshot | null;
  notes: string;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [expandedLineItemIndex, setExpandedLineItemIndex] = useState<number | null>(0);

  // Generated quote
  const [quote, setQuote] = useState<GeneratedQuote | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("generating");

    try {
      const res = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, additionalDetails, clientAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setQuote(data);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  }

  async function handleSave(sendVia: string[]) {
    if (!quote) return;
    setSaving(true);
    setError("");

    try {
      const quotePayload: Partial<GeneratedQuote> = { ...quote };
      delete quotePayload.suggested_addons;
      delete quotePayload.assistant_notes;
      delete quotePayload.assumptions;
      delete quotePayload.risk_flags;
      delete quotePayload.terms_suggestion;

      // Save quote to DB
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          client_address: clientAddress || null,
          scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
          scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
          ...quotePayload,
          status: "draft",
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error ?? "Save failed");

      // Send if requested
      if (sendVia.length > 0) {
        const sendRes = await fetch("/api/quotes/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quoteId: saved.id, via: sendVia }),
        });
        const sendResult = await sendRes.json();
        if (!sendRes.ok) {
          throw new Error(sendResult.details?.[0]?.message ?? sendResult.error ?? "Quote saved, but sending failed.");
        }
      }

      router.push(`/quotes/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  function updateQuotePricing(lineItems: GeneratedQuote["line_items"], taxRate = quote?.tax_rate ?? 0) {
    if (!quote) return;
    const calculated = calculateQuotePricing({ line_items: lineItems, tax_rate: taxRate });
    setQuote({
      ...quote,
      ...calculated,
      pricing_source: determineQuotePricingSource(calculated.line_items),
    });
  }

  function updateLineItem(index: number, patch: Partial<QuoteLineItem>) {
    if (!quote) return;
    const nextItems = quote.line_items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return {
        ...item,
        ...patch,
        edited_by_contractor: true,
        pricing_source: "manual_edit" as const,
      };
    });
    updateQuotePricing(nextItems);
  }

  function addLineItem() {
    if (!quote) return;
    updateQuotePricing([
      ...quote.line_items,
      {
        description: "New line item",
        quantity: 1,
        unit: "unit",
        unit_price: 0,
        total: 0,
        edited_by_contractor: true,
        pricing_source: "manual_edit",
      },
    ]);
  }

  function removeLineItem(index: number) {
    if (!quote) return;
    updateQuotePricing(quote.line_items.filter((_, itemIndex) => itemIndex !== index));
  }

  // Form step
  if (step === "form") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 xl:py-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft size={24} weight="bold" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tr-blue)]">Quote builder</p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">New Quote</h1>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <Surface className="p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Client details</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Client name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Smith" required />
                <Input label="Email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
                <Input label="Phone" type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(305) 555-0100" />
                <Input label="Address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Main St, Miami FL" />
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Schedule</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Job start" type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} />
                <Input label="Job end" type="datetime-local" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} />
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="mb-4 text-lg font-bold text-white">Job notes</h2>
              <div className="space-y-3">
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Describe the job in plain English. Example: Paint interior of 3-bedroom house, walls and ceilings only, about 1,800 sq ft."
                  rows={6}
                  required
                  className="tr-input w-full resize-none rounded-xl px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none"
                />
                <textarea
                  value={additionalDetails}
                  onChange={e => setAdditionalDetails(e.target.value)}
                  placeholder="Optional details: access, materials, timeline, client concerns, photos taken..."
                  rows={3}
                  className="tr-input w-full resize-none rounded-xl px-4 py-3 text-base placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </Surface>
          </div>

          <Surface className="h-fit p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--tr-violet)]/15 text-[var(--tr-violet)]">
                <Lightning size={24} weight="duotone" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">Quote Assistant</h2>
                <p className="text-sm text-[var(--tr-text-muted)]">Uses OpenAI to turn notes into a quote.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[var(--tr-text-muted)]">
              <p>Write notes like you would text a crew lead. Taskrel will structure line items, assumptions, and review tips.</p>
              <p>No supplier price feeds are used. Suggestions come from the job notes and your trade context.</p>
            </div>
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
            <Button type="submit" className="mt-5 w-full" size="lg">
              <Lightning size={19} weight="duotone" />
              Generate Quote
            </Button>
          </Surface>

        </form>
      </div>
    );
  }

  // Generating step
  if (step === "generating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#F97316] border-r-transparent" />
        <p className="text-white font-medium">Generating your quote...</p>
        <p className="text-slate-400 text-sm">Usually takes 5-10 seconds</p>
      </div>
    );
  }

  // Review step
  if (step === "review" && quote) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 xl:py-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => setStep("form")} className="text-slate-400 hover:text-white">
            <ArrowLeft size={24} weight="bold" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tr-blue)]">Ready to review</p>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Review Quote</h1>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-4">
            <Surface className="p-4">
              <p className="text-sm text-slate-400">Client</p>
              <p className="font-medium text-white">{clientName}</p>
              {clientAddress && <p className="text-sm text-slate-400">{clientAddress}</p>}
              {scheduledStart && (
                <p className="text-sm text-slate-400">
                  {new Date(scheduledStart).toLocaleString()}
                  {scheduledEnd && ` - ${new Date(scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              )}
            </Surface>

            <Surface className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Line Items</p>
                <button type="button" onClick={addLineItem} className="text-sm font-semibold text-[var(--tr-blue)]">
                  Add item
                </button>
              </div>
              <div className="divide-y divide-slate-700/50">
                {quote.line_items.map((item, i) => (
                  <div key={i} className="px-4 py-4">
                    <div className="lg:hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedLineItemIndex(expandedLineItemIndex === i ? null : i)}
                        className="flex w-full items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/25 p-3 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block line-clamp-2 text-sm font-semibold leading-5 text-white">{item.description}</span>
                          <span className="mt-1 block text-xs text-[var(--tr-text-muted)]">
                            {item.quantity} {item.unit ?? "unit"} x {formatCurrency(item.unit_price)}
                          </span>
                          <span className="mt-1 block text-[11px] font-semibold text-[var(--tr-text-faint)]">{sourceLabel(item.pricing_source)}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-black text-white">{formatCurrency(item.total)}</span>
                          <span className="mt-2 inline-flex rounded-full bg-[var(--tr-blue)]/12 px-2 py-1 text-[11px] font-bold text-[var(--tr-blue)]">
                            {expandedLineItemIndex === i ? "Done" : "Edit"}
                          </span>
                        </span>
                      </button>
                      {expandedLineItemIndex === i && (
                        <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-[#0F172A] p-3">
                          <label className="block">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Description</span>
                            <textarea
                              value={item.description}
                              onChange={event => updateLineItem(i, { description: event.target.value })}
                              rows={3}
                              className="tr-input mt-1 w-full resize-none rounded-lg px-3 py-2 text-sm leading-5"
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Qty</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity}
                                onChange={event => updateLineItem(i, { quantity: Number(event.target.value) })}
                                className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unit</span>
                              <input
                                value={item.unit ?? "unit"}
                                onChange={event => updateLineItem(i, { unit: event.target.value })}
                                className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                              />
                            </label>
                          </div>
                          <label className="block">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unit price</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={event => updateLineItem(i, { unit_price: Number(event.target.value) })}
                              className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                            />
                          </label>
                          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                            <p className="text-sm font-semibold text-white">Line total {formatCurrency(item.total)}</p>
                            <button type="button" onClick={() => removeLineItem(i)} className="text-xs font-semibold text-red-300 hover:text-red-200">
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="hidden gap-3 lg:grid lg:grid-cols-[1fr_92px_90px_120px_90px]">
                      <div className="min-w-0">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Description</label>
                        <input
                          value={item.description}
                          onChange={event => updateLineItem(i, { description: event.target.value })}
                          className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                        />
                        <p className="mt-1 text-xs text-[var(--tr-text-faint)]">{sourceLabel(item.pricing_source)}</p>
                      </div>
                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Qty</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={event => updateLineItem(i, { quantity: Number(event.target.value) })}
                          className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unit</span>
                        <input
                          value={item.unit ?? "unit"}
                          onChange={event => updateLineItem(i, { unit: event.target.value })}
                          className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unit price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={event => updateLineItem(i, { unit_price: Number(event.target.value) })}
                          className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                        />
                      </label>
                      <div className="flex items-end justify-between gap-3 lg:block lg:text-right">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
                          <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(item.total)}</p>
                        </div>
                        <button type="button" onClick={() => removeLineItem(i)} className="text-xs font-semibold text-red-300 hover:text-red-200">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t border-slate-700 px-4 py-3">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Subtotal</span>
                  <span>${quote.subtotal.toFixed(2)}</span>
                </div>
                {quote.tax_amount > 0 && (
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Tax ({(quote.tax_rate * 100).toFixed(1)}%)</span>
                    <span>${quote.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-base font-bold text-[var(--tr-amber)]">
                  <span>Total</span>
                  <span>${quote.total.toFixed(2)}</span>
                </div>
              </div>
            </Surface>

            {quote.notes && (
              <Surface className="p-4">
                <p className="mb-1 text-sm text-slate-400">Note to client</p>
                <p className="text-sm text-slate-300">{quote.notes}</p>
              </Surface>
            )}
          </div>

          <Surface className="h-fit p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Lightning size={22} weight="duotone" className="text-[var(--tr-violet)]" />
              Assistant review
            </h2>
            {quote.pricing_recommendation_snapshot && (
              <PricingIntelligenceSummary recommendation={quote.pricing_recommendation_snapshot} />
            )}
            <AssistantList title="Notes" items={quote.assistant_notes} />
            <AssistantList title="Assumptions" items={quote.assumptions} />
            <AssistantList title="Risk flags" items={quote.risk_flags} tone="warning" />
            {quote.terms_suggestion && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">Terms suggestion</p>
                <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{quote.terms_suggestion}</p>
              </div>
            )}
            {quote.suggested_addons?.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">Suggested add-ons</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quote.suggested_addons.map(addon => (
                    <span key={addon.label} className="inline-flex items-center gap-1 rounded-full border border-[var(--tr-violet)]/30 bg-[var(--tr-violet)]/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
                      <Plus size={13} />
                      {addon.label} (${addon.price})
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Surface>
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {/* Actions */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(clientEmail || clientPhone) && (
            <Button
              className="w-full"
              size="lg"
              loading={saving}
              onClick={() => {
                const via = [];
                if (clientEmail) via.push("email");
                if (clientPhone) via.push("sms");
                handleSave(via);
              }}
            >
              Send Quote
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            loading={saving}
            onClick={() => handleSave([])}
          >
            Save as Draft
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function AssistantList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items?: string[];
  tone?: "default" | "warning";
}) {
  if (!items?.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map(item => (
          <li
            key={item}
            className={`text-sm leading-5 ${tone === "warning" ? "text-amber-100" : "text-[var(--tr-text-muted)]"}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingIntelligenceSummary({ recommendation }: { recommendation: PricingRecommendationSnapshot }) {
  return (
    <div className="mt-4 rounded-xl border border-[var(--tr-amber)]/25 bg-[var(--tr-amber)]/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-amber)]">Internal pricing</p>
      <div className="mt-2 space-y-1 text-sm">
        <SummaryRow label="Total overhead" value={formatMoney(recommendation.total_overhead_cost)} />
        <SummaryRow
          label={`Property adjustment (${recommendation.property_value_adjustment_percent}%)`}
          value={formatMoney(recommendation.property_value_adjustment_amount)}
        />
        <SummaryRow label="Recommended subtotal" value={formatMoney(recommendation.recommended_subtotal)} strong />
      </div>
      <p className="mt-2 text-xs leading-5 text-amber-100/80">
        Internal only. Edit line item prices manually if you want to account for this recommendation.
      </p>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-300">{label}</span>
      <span className={strong ? "font-bold text-white" : "font-semibold text-white"}>{value}</span>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function sourceLabel(source?: string) {
  switch (source) {
    case "catalog_match":
      return "Saved rate";
    case "manual_edit":
      return "Edited";
    case "mixed":
      return "Mixed pricing";
    case "ai_estimate":
    default:
      return "AI estimate";
  }
}
