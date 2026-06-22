"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarBlank, CheckCircle, DeviceMobile, EnvelopeSimple, FileText, MapPin, Receipt, SealCheck } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { calculateQuotePricing, determineQuotePricingSource } from "@/lib/pricing";
import { renderQuoteDocumentHtml } from "@/lib/quote-document";
import { deliveryEventSummary } from "@/lib/delivery-events";
import type { PricingRecommendationSnapshot, PropertyValuationSnapshot, Quote, QuoteLineItem, QuoteTemplatePreset } from "@/types";
import { getQuoteWorkflowState, type QuoteReadinessItem } from "@/components/quotes/quote-workflow-model";

const presets: { value: QuoteTemplatePreset; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
  { value: "compact", label: "Compact" },
];

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [previewPreset, setPreviewPreset] = useState<QuoteTemplatePreset>("classic");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const [propertyValueInput, setPropertyValueInput] = useState("");
  const [propertyMessage, setPropertyMessage] = useState("");
  const [propertyError, setPropertyError] = useState("");
  const [verifyingProperty, setVerifyingProperty] = useState(false);
  const [expandedLineItemIndex, setExpandedLineItemIndex] = useState<number | null>(0);

  const fetchQuote = useCallback(async () => {
    const response = await fetch(`/api/quotes/${id}`);
    const data = await response.json();
    return { ok: response.ok, data };
  }, [id]);

  const applyQuoteResult = useCallback((result: { ok: boolean; data: Quote }) => {
    setQuote(result.ok ? result.data : null);
    if (result.ok) {
      setPreviewPreset(result.data.template_preset ?? "classic");
      setPropertyValueInput(result.data.property_valuation_snapshot?.estimated_value?.toString() ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchQuote().then(result => {
      if (!ignore) applyQuoteResult(result);
    });
    return () => {
      ignore = true;
    };
  }, [applyQuoteResult, fetchQuote]);

  async function handleSend(via: string[]) {
    setSending(true);
    setSendMessage("");
    setSendError("");
    const response = await fetch("/api/quotes/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: id, via }),
    });
    const result = await response.json();
    if (!response.ok) {
      setSendError(result.details?.[0]?.message ?? result.error ?? "Quote could not be sent.");
      setSending(false);
      return;
    }
    if (result.details?.length) {
      setSendMessage(result.details[0].message);
    } else {
      setSendMessage("Quote sent.");
    }
    applyQuoteResult(await fetchQuote());
    setSending(false);
  }

  async function handleConvertToInvoice() {
    setConverting(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: id }),
    });
    const data = await res.json();
    setConverting(false);
    if (data.id) router.push(`/invoices/${data.id}`);
  }

  function updateQuotePricing(lineItems: QuoteLineItem[], taxRate = quote?.tax_rate ?? 0) {
    if (!quote) return;
    const calculated = calculateQuotePricing({ line_items: lineItems, tax_rate: taxRate });
    setQuote({
      ...quote,
      ...calculated,
      pricing_source: determineQuotePricingSource(calculated.line_items),
    });
    setDirty(true);
  }

  function updateLineItem(index: number, patch: Partial<QuoteLineItem>) {
    if (!quote) return;
    updateQuotePricing(quote.line_items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return {
        ...item,
        ...patch,
        edited_by_contractor: true,
        pricing_source: "manual_edit" as const,
      };
    }));
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

  async function handleSaveQuote() {
    if (!quote) return;
    setSavingQuote(true);
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        line_items: quote.line_items,
        tax_rate: quote.tax_rate,
        notes: quote.notes,
        property_valuation_snapshot: quote.property_valuation_snapshot,
        pricing_source: quote.pricing_source,
        pricing_confidence: quote.pricing_confidence,
      }),
    });
    if (res.ok) {
      applyQuoteResult(await fetchQuote());
      setDirty(false);
    }
    setSavingQuote(false);
  }

  async function savePropertyValuation(snapshot: PropertyValuationSnapshot | null) {
    if (!quote) return;
    setPropertyMessage("");
    setPropertyError("");
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_valuation_snapshot: snapshot }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPropertyError(data.error ?? "Property value could not be saved.");
      return;
    }
    applyQuoteResult({ ok: true, data });
    setPropertyMessage(snapshot ? "Property value saved for the pricing check." : "Property value removed.");
  }

  async function handleSaveManualPropertyValue() {
    if (!quote) return;
    const value = Number(propertyValueInput);
    if (!Number.isFinite(value) || value <= 0) {
      setPropertyError("Enter a property value greater than zero.");
      setPropertyMessage("");
      return;
    }
    await savePropertyValuation({
      address: quote.client_address ?? "",
      normalized_address: quote.client_address,
      estimated_value: Math.round(value * 100) / 100,
      value_low: null,
      value_high: null,
      confidence: null,
      source: "manual",
      fetched_at: null,
    });
  }

  async function handleVerifyPropertyValue() {
    if (!quote?.client_address) {
      setPropertyError("Add a client address before verifying property value.");
      setPropertyMessage("");
      return;
    }

    setVerifyingProperty(true);
    setPropertyMessage("");
    setPropertyError("");
    const res = await fetch("/api/property/valuation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: quote.client_address }),
    });
    const data = await res.json();
    setVerifyingProperty(false);

    if (!res.ok) {
      setPropertyError(data.error ?? "Property value lookup failed. Enter it manually.");
      return;
    }

    await savePropertyValuation(data);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-medium text-slate-400">
        Loading quote...
      </div>
    );
  }

  if (!quote) return <div className="p-6 text-slate-400">Quote not found.</div>;

  const sendVia = [
    ...(quote.client_email ? ["email"] : []),
    ...(quote.client_phone ? ["sms"] : []),
  ];
  const documentHtml = quote.business_snapshot
    ? renderQuoteDocumentHtml({ quote, business: quote.business_snapshot, preset: previewPreset })
    : "";
  const workflowState = getQuoteWorkflowState(quote);
  const deliverySummary = deliveryEventSummary(quote.delivery_events ?? []);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--tr-border)] bg-[var(--tr-surface)] text-slate-400 hover:text-white"
        >
          <ArrowLeft size={20} weight="bold" />
          <span className="sr-only">Back</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--tr-blue)]">{workflowState.bucketLabel}</p>
          <h1 className="truncate text-2xl font-bold text-white md:text-3xl">{quote.client_name}</h1>
          <p className="text-sm text-[var(--tr-text-muted)]">{workflowState.nextActionDetail}</p>
        </div>
        <Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <aside className="order-2 space-y-4 lg:order-2">
          <Surface className="p-5">
            <p className="text-sm font-bold text-[var(--tr-text-muted)]">Quote total</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-white">{formatCurrency(quote.total)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--tr-blue)]/12 px-2.5 py-1 text-xs font-bold text-[var(--tr-blue)]">
                {workflowState.nextAction}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${deliveryClass(workflowState.deliveryTone)}`}>
                {workflowState.deliveryLabel}
              </span>
              {dirty && (
                <span className="rounded-full bg-[var(--tr-amber)]/12 px-2.5 py-1 text-xs font-bold text-[var(--tr-amber)]">
                  Unsaved edits
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <SummaryMeta icon={<FileText size={15} weight="duotone" />} label="Status" value={quote.status} />
              <SummaryMeta icon={<CalendarBlank size={15} weight="duotone" />} label="Scheduled" value={quote.scheduled_start ? formatDate(quote.scheduled_start) : "Not scheduled"} />
              <SummaryMeta icon={<EnvelopeSimple size={15} weight="duotone" />} label="Delivery" value={quote.sent_via?.length ? quote.sent_via.join(" + ") : "Ready"} />
              <SummaryMeta icon={<DeviceMobile size={15} weight="duotone" />} label="Contact" value={quote.client_phone ? "Phone saved" : quote.client_email ? "Email saved" : "Missing"} />
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-bold text-white">Review readiness</h2>
            <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">
              {workflowState.completedReadiness} of {workflowState.totalReadiness} checks ready before this quote is sent or converted.
            </p>
            <div className="mt-4 space-y-2">
              {workflowState.readiness.map(item => (
                <ReadinessRow key={item.key} item={item} />
              ))}
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-bold text-white">Send proof</h2>
            <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">
              {deliverySummary.latestSuccessLabel ?? "No successful send recorded yet."}
            </p>
            <div className="mt-4 space-y-2">
              {(quote.delivery_events ?? []).slice(0, 4).map(event => (
                <div key={event.id} className={`rounded-lg border p-3 ${event.status === "success" ? "border-emerald-300/20 bg-emerald-300/10" : "border-amber-300/20 bg-amber-300/10"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm font-semibold ${event.status === "success" ? "text-emerald-100" : "text-amber-100"}`}>
                      {event.channel.toUpperCase()} / {event.status}
                    </p>
                    <p className="shrink-0 text-xs text-[var(--tr-text-faint)]">{formatDate(event.created_at)} {formatTime(event.created_at)}</p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{event.message}</p>
                  {event.recipient && <p className="mt-1 text-xs text-[var(--tr-text-faint)]">{event.recipient}</p>}
                </div>
              ))}
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-bold text-white">Actions</h2>
            {dirty && (
              <p className="mt-2 rounded-lg bg-[var(--tr-amber)]/10 p-3 text-sm leading-5 text-amber-100">
                Save pricing changes before sending or converting so the client document matches your latest totals.
              </p>
            )}
            <div className="mt-4 space-y-3">
              {dirty && (
                <Button variant="secondary" className="w-full" onClick={handleSaveQuote} loading={savingQuote}>
                  <FileText size={18} weight="duotone" />
                  Save pricing changes
                </Button>
              )}
              {["draft", "sent", "approved"].includes(quote.status) && (
                <Button className="w-full" onClick={handleConvertToInvoice} loading={converting} disabled={dirty}>
                  <Receipt size={18} weight="duotone" />
                  {quote.status === "approved" ? "Create Invoice" : "Approve & Convert"}
                </Button>
              )}
              {quote.status === "draft" && (
                <Button className="w-full" onClick={() => handleSend(sendVia)} loading={sending} disabled={dirty || sendVia.length === 0}>
                  <EnvelopeSimple size={18} weight="duotone" />
                  Send Quote
                </Button>
              )}
              {quote.status === "sent" && (
                <Button variant="secondary" className="w-full" onClick={() => handleSend(sendVia)} loading={sending} disabled={dirty || sendVia.length === 0}>
                  <EnvelopeSimple size={18} weight="duotone" />
                  Resend Quote
                </Button>
              )}
              {sendVia.length === 0 && (
                <p className="text-sm text-[var(--tr-text-muted)]">Add an email or phone to send this quote.</p>
              )}
              {sendError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{sendError}</p>
              )}
              {sendMessage && !sendError && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{sendMessage}</p>
              )}
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-bold text-white">Client</h2>
            <div className="mt-3 space-y-2 text-sm text-[var(--tr-text-muted)]">
              {quote.client_email && <p>{quote.client_email}</p>}
              {quote.client_phone && <p>{quote.client_phone}</p>}
              {quote.client_address && (
                <p className="flex items-start gap-2">
                  <MapPin size={16} weight="duotone" className="mt-0.5 shrink-0 text-slate-500" />
                  <span>{quote.client_address}</span>
                </p>
              )}
            </div>
          </Surface>

          <PricingIntelligencePanel
            recommendation={quote.pricing_recommendation_snapshot}
            valuation={quote.property_valuation_snapshot}
            propertyValueInput={propertyValueInput}
            setPropertyValueInput={setPropertyValueInput}
            propertyMessage={propertyMessage}
            propertyError={propertyError}
            verifyingProperty={verifyingProperty}
            onSaveManual={handleSaveManualPropertyValue}
            onVerify={handleVerifyPropertyValue}
            onClear={() => savePropertyValuation(null)}
            hasAddress={Boolean(quote.client_address)}
          />
        </aside>

        <main className="order-1 space-y-5 lg:order-1">
          <Surface className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Line items</p>
              <button type="button" onClick={addLineItem} className="text-sm font-semibold text-[var(--tr-blue)]">
                Add item
              </button>
            </div>
            <div className="divide-y divide-slate-700/50">
              {quote.line_items.map((item, index) => (
                <div key={index} className="px-4 py-4">
                  <div className="lg:hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedLineItemIndex(expandedLineItemIndex === index ? null : index)}
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
                          {expandedLineItemIndex === index ? "Done" : "Edit"}
                        </span>
                      </span>
                    </button>
                    {expandedLineItemIndex === index && (
                      <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-slate-950/30 p-3">
                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Description</span>
                          <textarea
                            value={item.description}
                            onChange={event => updateLineItem(index, { description: event.target.value })}
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
                              onChange={event => updateLineItem(index, { quantity: Number(event.target.value) })}
                              className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unit</span>
                            <input
                              value={item.unit ?? "unit"}
                              onChange={event => updateLineItem(index, { unit: event.target.value })}
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
                            onChange={event => updateLineItem(index, { unit_price: Number(event.target.value) })}
                            className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                          />
                        </label>
                        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                          <p className="text-sm font-semibold text-white">Line total {formatCurrency(item.total)}</p>
                          <button type="button" onClick={() => removeLineItem(index)} className="text-xs font-semibold text-red-300 hover:text-red-200">
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
                        onChange={event => updateLineItem(index, { description: event.target.value })}
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
                        onChange={event => updateLineItem(index, { quantity: Number(event.target.value) })}
                        className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Unit</span>
                      <input
                        value={item.unit ?? "unit"}
                        onChange={event => updateLineItem(index, { unit: event.target.value })}
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
                        onChange={event => updateLineItem(index, { unit_price: Number(event.target.value) })}
                        className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                      />
                    </label>
                    <div className="flex items-end justify-between gap-3 lg:block lg:text-right">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
                        <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(item.total)}</p>
                      </div>
                      <button type="button" onClick={() => removeLineItem(index)} className="text-xs font-semibold text-red-300 hover:text-red-200">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-slate-700/70 px-4 py-3">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal</span><span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.tax_amount > 0 && (
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Tax</span><span>{formatCurrency(quote.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[var(--tr-amber)]">
                <span>Total</span><span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </Surface>

          {quote.notes && (
            <Surface className="p-4">
              <p className="mb-1 text-sm font-semibold text-white">Client note</p>
              <p className="text-sm leading-6 text-[var(--tr-text-muted)]">{quote.notes}</p>
            </Surface>
          )}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client preview</h2>
              <div className="flex rounded-lg bg-slate-800 p-1">
                {presets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => setPreviewPreset(preset.value)}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${
                      previewPreset === preset.value ? "bg-[var(--tr-blue)] text-[#09204f]" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-lg bg-transparent">
              <div className="max-h-[720px] overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: documentHtml }} />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryMeta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold capitalize text-white">{value}</p>
    </div>
  );
}

function ReadinessRow({ item }: { item: QuoteReadinessItem }) {
  return (
    <div className="flex gap-2 rounded-lg bg-white/[0.04] p-2.5">
      <span className={item.complete ? "text-[var(--tr-green)]" : "text-[var(--tr-amber)]"}>
        {item.complete ? <CheckCircle size={16} weight="duotone" /> : <SealCheck size={16} weight="duotone" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">{item.label}</span>
        <span className="block text-xs leading-5 text-[var(--tr-text-muted)]">{item.detail}</span>
      </span>
    </div>
  );
}

function deliveryClass(tone: "ready" | "sent" | "missing") {
  if (tone === "sent") return "bg-[var(--tr-green)]/12 text-[var(--tr-green)]";
  if (tone === "ready") return "bg-[var(--tr-blue)]/12 text-[var(--tr-blue)]";
  return "bg-[var(--tr-amber)]/12 text-[var(--tr-amber)]";
}

function PricingIntelligencePanel({
  recommendation,
  valuation,
  propertyValueInput,
  setPropertyValueInput,
  propertyMessage,
  propertyError,
  verifyingProperty,
  onSaveManual,
  onVerify,
  onClear,
  hasAddress,
}: {
  recommendation: PricingRecommendationSnapshot | null;
  valuation: PropertyValuationSnapshot | null;
  propertyValueInput: string;
  setPropertyValueInput: (value: string) => void;
  propertyMessage: string;
  propertyError: string;
  verifyingProperty: boolean;
  onSaveManual: () => void;
  onVerify: () => void;
  onClear: () => void;
  hasAddress: boolean;
}) {
  return (
    <Surface className="p-5">
      <h2 className="text-lg font-bold text-white">Pricing check</h2>
      <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">
        Internal only. These values help you price the work, but they do not appear on the client quote.
      </p>

      <div className="mt-4 space-y-2">
        <PricingRow label="Line item subtotal" value={recommendation ? formatCurrency(recommendation.subtotal) : "Not calculated"} />
        <PricingRow label="Fixed overhead" value={recommendation ? formatCurrency(recommendation.fixed_overhead_cost) : "-"} />
        <PricingRow label="Percent overhead" value={recommendation ? formatCurrency(recommendation.percent_overhead_cost) : "-"} />
        <PricingRow label="Total overhead" value={recommendation ? formatCurrency(recommendation.total_overhead_cost) : "-"} strong />
        <PricingRow
          label={`Property adjustment${recommendation ? ` (${recommendation.property_value_adjustment_percent}%)` : ""}`}
          value={recommendation ? formatCurrency(recommendation.property_value_adjustment_amount) : "-"}
        />
        <PricingRow label="Recommended subtotal" value={recommendation ? formatCurrency(recommendation.recommended_subtotal) : "Not calculated"} strong tone="text-[var(--tr-amber)]" />
      </div>

      {recommendation?.property_value_adjustment_reason && (
        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-[var(--tr-text-muted)]">
          {recommendation.property_value_adjustment_reason}
        </p>
      )}

      <div className="mt-5 space-y-3 rounded-lg border border-white/10 bg-slate-950/30 p-4">
        <div>
          <p className="text-sm font-semibold text-white">Property value</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Enter a value manually or verify the address with RentCast when configured.
          </p>
        </div>
        <input
          type="number"
          min="0"
          step="1000"
          value={propertyValueInput}
          onChange={event => setPropertyValueInput(event.target.value)}
          placeholder="Estimated property value"
          className="tr-input h-11 w-full rounded-lg px-3 text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" size="sm" onClick={onSaveManual}>
            Save value
          </Button>
          <Button variant="secondary" size="sm" onClick={onVerify} loading={verifyingProperty} disabled={!hasAddress}>
            Verify value
          </Button>
        </div>
        {valuation && (
          <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
            <p><span className="font-semibold text-slate-300">Source:</span> {valuation.source}</p>
            {valuation.normalized_address && <p><span className="font-semibold text-slate-300">Address:</span> {valuation.normalized_address}</p>}
            {(valuation.value_low || valuation.value_high) && (
              <p>
                <span className="font-semibold text-slate-300">Range:</span>{" "}
                {valuation.value_low ? formatCurrency(valuation.value_low) : "Unknown"} - {valuation.value_high ? formatCurrency(valuation.value_high) : "Unknown"}
              </p>
            )}
            {valuation.fetched_at && <p><span className="font-semibold text-slate-300">Fetched:</span> {formatDate(valuation.fetched_at)}</p>}
            <button type="button" onClick={onClear} className="pt-1 text-xs font-semibold text-red-300 hover:text-red-200">
              Clear property value
            </button>
          </div>
        )}
        {propertyError && <p className="text-sm text-red-300">{propertyError}</p>}
        {propertyMessage && !propertyError && <p className="text-sm text-emerald-300">{propertyMessage}</p>}
        {!hasAddress && <p className="text-xs text-slate-500">Add a client address to use RentCast verification.</p>}
      </div>
    </Surface>
  );
}

function PricingRow({
  label,
  value,
  strong,
  tone = "text-white",
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`${strong ? "font-bold" : "font-semibold"} ${tone}`}>{value}</span>
    </div>
  );
}

function sourceLabel(source?: QuoteLineItem["pricing_source"]) {
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
