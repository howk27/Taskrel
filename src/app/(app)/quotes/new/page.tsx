"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle, EnvelopeSimple, Lightning, Plus, SealCheck } from "@/components/ui/icons";
import { ReadinessList } from "@/components/ui/readiness";
import { Surface } from "@/components/ui/surface";
import { TRADE_LABELS, type PricingRecommendationSnapshot, type PropertyValuationSnapshot, type QuoteAssistantMetadata, type QuoteLineItem, type Trade } from "@/types";
import { calculateQuotePricing, determineQuotePricingSource } from "@/lib/pricing";
import { formatCurrency } from "@/lib/format";
import { getQuoteWorkflowState, type QuoteReadinessItem } from "@/components/quotes/quote-workflow-model";
import { getQuoteFormReadiness, todayDateInput } from "@/lib/readiness/setup-readiness";
import { SMS_ENABLED } from "@/lib/feature-flags";

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
  const [quoteDate, setQuoteDate] = useState(todayDateInput());
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [expandedLineItemIndex, setExpandedLineItemIndex] = useState<number | null>(0);
  const [availableTrades, setAvailableTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | "">("");

  // Generated quote
  const [quote, setQuote] = useState<GeneratedQuote | null>(null);
  const formReadiness = getQuoteFormReadiness({
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone,
    job_description: jobDescription,
    quote_date: quoteDate,
    scheduled_start: scheduledStart || null,
  });
  const canGenerate = formReadiness.every(item => item.state !== "error")
    && Boolean(selectedTrade)
    && formReadiness.find(item => item.key === "client")?.state === "complete"
    && formReadiness.find(item => item.key === "scope")?.state === "complete"
    && formReadiness.find(item => item.key === "quote_date")?.state === "complete";
  const generateLabel = !selectedTrade
    ? "Choose service"
    : !clientName.trim()
    ? "Add client name"
    : jobDescription.replace(/\s/g, "").length < 20
      ? "Describe job"
      : "Generate quote";

  useEffect(() => {
    let ignore = false;

    fetch("/api/quotes/generate")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { trades?: Trade[] } | null) => {
        if (ignore || !Array.isArray(data?.trades)) return;
        const trades = data.trades.filter((trade): trade is Trade => trade in TRADE_LABELS);
        setAvailableTrades(trades);
        setSelectedTrade((current) => current || trades[0] || "");
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!canGenerate) return;
    setError("");
    setStep("generating");

    try {
      const res = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, additionalDetails, clientAddress, trade: selectedTrade }),
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
          created_at: quoteDate ? new Date(`${quoteDate}T12:00:00`).toISOString() : undefined,
          trade: selectedTrade || undefined,
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
          <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-lg text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]" aria-label="Go back">
            <ArrowLeft size={24} weight="bold" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--tr-text)] md:text-3xl">New quote</h1>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <Surface className="p-5">
              <h2 className="mb-4 text-xl font-semibold text-[var(--tr-text)]">Service of quote</h2>
              {availableTrades.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {availableTrades.map((trade) => {
                    const active = selectedTrade === trade;
                    return (
                      <button
                        key={trade}
                        type="button"
                        onClick={() => setSelectedTrade(trade)}
                        className={`flex min-h-12 items-center justify-between gap-3 rounded-lg px-4 text-left transition-colors shadow-[inset_0_0_0_1px_var(--tr-border-soft)] ${
                          active
                            ? "bg-[var(--tr-primary-fill)] text-[var(--tr-text)]"
                            : "bg-[var(--tr-surface)] text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-2)]"
                        }`}
                      >
                        <span className="text-sm font-semibold">{TRADE_LABELS[trade]}</span>
                        {active && <CheckCircle size={18} weight="duotone" className="shrink-0 text-[var(--tr-green)]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg bg-[var(--tr-bg-soft)] p-3 text-sm leading-6 text-[var(--tr-text-muted)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
                  Finish service setup in onboarding or settings before generating a quote.
                </p>
              )}
            </Surface>

            <Surface className="p-5">
              <h2 className="mb-4 text-xl font-semibold text-[var(--tr-text)]">Client</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Client name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Smith" required />
                <Input label="Email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
                <Input label="Phone" type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(305) 555-0100" />
                <Input label="Address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Main St, Miami FL" />
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="mb-4 text-xl font-semibold text-[var(--tr-text)]">Dates</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="Quote date" type="date" value={quoteDate} onChange={event => setQuoteDate(event.target.value)} required />
                <Input label="Scheduled start" type="datetime-local" value={scheduledStart} onChange={event => setScheduledStart(event.target.value)} />
                <Input label="Scheduled end" type="datetime-local" value={scheduledEnd} onChange={event => setScheduledEnd(event.target.value)} />
              </div>
            </Surface>

            <Surface className="p-5">
              <h2 className="mb-4 text-xl font-semibold text-[var(--tr-text)]">Job notes</h2>
              <div className="space-y-3">
                <textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Describe the job in plain English. Example: Paint interior of 3-bedroom house, walls and ceilings only, about 1,800 sq ft."
                  rows={6}
                  required
                  className="tr-input w-full resize-none rounded-lg px-3 py-3 text-sm placeholder:text-[var(--tr-text-faint)] focus:outline-none"
                />
                <textarea
                  value={additionalDetails}
                  onChange={e => setAdditionalDetails(e.target.value)}
                  placeholder="Optional details: access, materials, timeline, client concerns, photos taken..."
                  rows={3}
                  className="tr-input w-full resize-none rounded-lg px-3 py-3 text-sm placeholder:text-[var(--tr-text-faint)] focus:outline-none"
                />
              </div>
            </Surface>
          </div>

          <Surface className="h-fit p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--tr-primary-fill)] text-[var(--tr-primary)]">
                <Lightning size={24} weight="duotone" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[var(--tr-text)]">Quote assistant</h2>
                <p className="text-sm text-[var(--tr-text-muted)]">
                  {selectedTrade ? `Drafting as ${TRADE_LABELS[selectedTrade]}.` : "Choose a service before drafting."}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <ReadinessList items={formReadiness} />
            </div>
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
            <Button type="submit" className="mt-5 w-full" size="lg" disabled={!canGenerate}>
              <Lightning size={19} weight="duotone" />
              {generateLabel}
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
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--tr-primary)] border-r-transparent" />
        <p className="font-medium text-[var(--tr-text)]">Generating your quote...</p>
        <p className="text-sm text-[var(--tr-text-muted)]">Usually takes 5-10 seconds</p>
      </div>
    );
  }

  // Review step
  if (step === "review" && quote) {
    const reviewState = getQuoteWorkflowState({
      id: "new",
      client_name: clientName || "New client",
      client_address: clientAddress || null,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      total: quote.total,
      status: "draft",
      created_at: quoteDate ? new Date(`${quoteDate}T12:00:00`).toISOString() : new Date().toISOString(),
      updated_at: null,
      scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      sent_via: [],
      line_items: quote.line_items,
      notes: quote.notes,
    });
    const sendChannels = [
      ...(clientEmail ? ["email"] : []),
      // SMS is implemented but not launched in v1 (see SMS_ENABLED / TCPA).
      ...(SMS_ENABLED && clientPhone ? ["sms"] : []),
    ];
    const attentionItems = reviewState.readiness.filter(item => !item.complete);

    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 xl:py-8">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => setStep("form")} className="grid h-10 w-10 place-items-center rounded-lg text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]" aria-label="Back to quote form">
            <ArrowLeft size={24} weight="bold" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--tr-text)] md:text-3xl">Review quote</h1>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-4">
            <Surface className="p-4">
              <p className="text-base font-semibold text-[var(--tr-text)]">Client</p>
              <p className="font-medium text-[var(--tr-text)]">{clientName}</p>
              {clientAddress && <p className="text-sm text-[var(--tr-text-muted)]">{clientAddress}</p>}
              <div className="mt-3 space-y-1 text-sm text-[var(--tr-text-muted)]">
                <p>Service: {selectedTrade ? TRADE_LABELS[selectedTrade] : "Not selected"}</p>
                <p>Quote date: {formatQuoteDate(quoteDate)}</p>
                <p>
                  Scheduled work:{" "}
                  {scheduledStart
                    ? `${formatScheduledDateTime(scheduledStart)}${scheduledEnd ? ` to ${formatScheduledDateTime(scheduledEnd)}` : ""}`
                    : "Not scheduled"}
                </p>
              </div>
            </Surface>

            <Surface className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--tr-border-soft)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--tr-text-muted)]">Line items</p>
                <button type="button" onClick={addLineItem} className="text-sm font-semibold text-[var(--tr-primary)]">
                  Add item
                </button>
              </div>
              <div className="divide-y divide-[var(--tr-border-soft)]">
                {quote.line_items.map((item, i) => (
                  <div key={i} className="px-4 py-4">
                    <div className="lg:hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedLineItemIndex(expandedLineItemIndex === i ? null : i)}
                        className="flex w-full items-start justify-between gap-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 text-left shadow-[inset_0_0_0_1px_var(--tr-border-soft)]"
                      >
                        <span className="min-w-0">
                          <span className="block line-clamp-2 text-sm font-semibold leading-5 text-[var(--tr-text)]">{item.description}</span>
                          <span className="mt-1 block text-sm text-[var(--tr-text-muted)]">
                            {item.quantity} {item.unit ?? "unit"} x {formatCurrency(item.unit_price)}
                          </span>
                          <span className="mt-1 block text-sm font-semibold text-[var(--tr-text-muted)]">{sourceLabel(item.pricing_source)}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold text-[var(--tr-text)]">{formatCurrency(item.total)}</span>
                          <span className="mt-2 inline-flex rounded-md bg-[var(--tr-badge-info-bg)] px-2 py-1 text-sm font-semibold text-[var(--tr-badge-info-text)] ring-1 ring-[var(--tr-badge-info-ring)]">
                            {expandedLineItemIndex === i ? "Done" : "Edit"}
                          </span>
                        </span>
                      </button>
                      {expandedLineItemIndex === i && (
                        <div className="mt-3 space-y-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
                          <label className="block">
                            <span className="text-sm font-medium text-[var(--tr-text-muted)]">Description</span>
                            <textarea
                              value={item.description}
                              onChange={event => updateLineItem(i, { description: event.target.value })}
                              rows={3}
                              className="tr-input mt-1 w-full resize-none rounded-lg px-3 py-2 text-sm leading-5"
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-sm font-medium text-[var(--tr-text-muted)]">Qty</span>
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
                              <span className="text-sm font-medium text-[var(--tr-text-muted)]">Unit</span>
                              <input
                                value={item.unit ?? "unit"}
                                onChange={event => updateLineItem(i, { unit: event.target.value })}
                                className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                              />
                            </label>
                          </div>
                          <label className="block">
                            <span className="text-sm font-medium text-[var(--tr-text-muted)]">Unit price</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={event => updateLineItem(i, { unit_price: Number(event.target.value) })}
                              className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                            />
                          </label>
                          <div className="flex items-center justify-between gap-3 border-t border-[var(--tr-border-soft)] pt-3">
                            <p className="text-sm font-semibold text-[var(--tr-text)]">Line total {formatCurrency(item.total)}</p>
                            <button type="button" onClick={() => removeLineItem(i)} className="text-sm font-semibold text-red-300 hover:text-red-200">
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="hidden gap-3 lg:grid lg:grid-cols-[1fr_92px_90px_120px_90px]">
                      <div className="min-w-0">
                        <label className="text-sm font-medium text-[var(--tr-text-muted)]">Description</label>
                        <input
                          value={item.description}
                          onChange={event => updateLineItem(i, { description: event.target.value })}
                          className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                        />
                        <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{sourceLabel(item.pricing_source)}</p>
                      </div>
                      <label className="block">
                        <span className="text-sm font-medium text-[var(--tr-text-muted)]">Qty</span>
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
                        <span className="text-sm font-medium text-[var(--tr-text-muted)]">Unit</span>
                        <input
                          value={item.unit ?? "unit"}
                          onChange={event => updateLineItem(i, { unit: event.target.value })}
                          className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-[var(--tr-text-muted)]">Unit price</span>
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
                          <p className="text-sm font-medium text-[var(--tr-text-muted)]">Total</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--tr-text)]">{formatCurrency(item.total)}</p>
                        </div>
                        <button type="button" onClick={() => removeLineItem(i)} className="text-sm font-semibold text-red-300 hover:text-red-200">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t border-[var(--tr-border-soft)] px-4 py-3">
                <div className="flex justify-between text-sm text-[var(--tr-text-muted)]">
                  <span>Subtotal</span>
                  <span>${quote.subtotal.toFixed(2)}</span>
                </div>
                {quote.tax_amount > 0 && (
                  <div className="flex justify-between text-sm text-[var(--tr-text-muted)]">
                    <span>Tax ({(quote.tax_rate * 100).toFixed(1)}%)</span>
                    <span>${quote.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-base font-semibold text-[var(--tr-primary)]">
                  <span>Total</span>
                  <span>${quote.total.toFixed(2)}</span>
                </div>
              </div>
            </Surface>

            {quote.notes && (
              <Surface className="p-4">
                <p className="mb-1 text-sm text-[var(--tr-text-muted)]">Note to client</p>
                <p className="text-sm text-[var(--tr-text)]">{quote.notes}</p>
              </Surface>
            )}
          </div>

          <aside className="space-y-4">
            <Surface className="h-fit p-5">
              <p className="text-sm font-semibold text-[var(--tr-primary)]">{reviewState.bucketLabel}</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--tr-text)]">{reviewState.nextAction}</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">
                {attentionItems.length > 0
                  ? `${attentionItems.length} ${attentionItems.length === 1 ? "item needs" : "items need"} attention.`
                  : `${reviewState.deliveryLabel}.`}
              </p>
              <div className="mt-4 space-y-2">
                {(attentionItems.length > 0 ? attentionItems : reviewState.readiness.slice(0, 1)).map(item => (
                  <ReadinessRow key={item.key} item={item} />
                ))}
              </div>
            </Surface>

            <Surface className="h-fit p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--tr-text)]">
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
                <div className="mt-4 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
                <p className="text-sm font-semibold text-[var(--tr-text)]">Terms suggestion</p>
                  <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{quote.terms_suggestion}</p>
                </div>
              )}
              {quote.suggested_addons?.length ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[var(--tr-text)]">Suggested add-ons</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quote.suggested_addons.map(addon => (
                      <span key={addon.label} className="inline-flex items-center gap-1 rounded-md bg-[var(--tr-badge-info-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--tr-badge-info-text)] ring-1 ring-[var(--tr-badge-info-ring)]">
                        <Plus size={13} />
                        {addon.label} (${addon.price})
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </Surface>
          </aside>
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
                handleSave(sendChannels);
              }}
            >
              <EnvelopeSimple size={18} weight="duotone" />
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
    <div className="mt-4 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <p className="text-sm font-semibold text-[var(--tr-text)]">{title}</p>
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

function ReadinessRow({ item }: { item: QuoteReadinessItem }) {
  return (
    <div className="flex gap-2 rounded-lg bg-[var(--tr-bg-soft)] p-2.5 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <span className={item.complete ? "text-[var(--tr-green)]" : "text-[var(--tr-amber)]"}>
        {item.complete ? <CheckCircle size={16} weight="duotone" /> : <SealCheck size={16} weight="duotone" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--tr-text)]">{item.label}</span>
        <span className="block text-sm leading-6 text-[var(--tr-text-muted)]">{item.detail}</span>
      </span>
    </div>
  );
}

function PricingIntelligenceSummary({ recommendation }: { recommendation: PricingRecommendationSnapshot }) {
  return (
    <div className="mt-4 rounded-lg bg-[var(--tr-warning-bg)] p-3 shadow-[inset_0_0_0_1px_var(--tr-badge-warning-ring)]">
      <p className="text-sm font-semibold text-[var(--tr-text)]">Internal pricing</p>
      <div className="mt-2 space-y-1 text-sm">
        <SummaryRow label="Total overhead" value={formatMoney(recommendation.total_overhead_cost)} />
        <SummaryRow
          label={`Property adjustment (${recommendation.property_value_adjustment_percent}%)`}
          value={formatMoney(recommendation.property_value_adjustment_amount)}
        />
        <SummaryRow label="Recommended subtotal" value={formatMoney(recommendation.recommended_subtotal)} strong />
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--tr-text-muted)]">
        Internal only. Edit line item prices manually if you want to account for this recommendation.
      </p>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--tr-text-muted)]">{label}</span>
      <span className={strong ? "font-semibold text-[var(--tr-text)]" : "font-medium text-[var(--tr-text)]"}>{value}</span>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatQuoteDate(value: string) {
  if (!value) return "Not set";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function formatScheduledDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
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
