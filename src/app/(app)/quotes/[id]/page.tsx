"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, DeviceMobile, EnvelopeSimple, FileText, MapPin, Receipt, SealCheck } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import { ActionRail } from "@/components/workflow/action-primitives";
import { formatCurrency, formatDate, formatDateNumeric, formatTime } from "@/lib/format";
import { calculateQuotePricing, determineQuotePricingSource } from "@/lib/pricing";
import { renderQuoteDocumentHtml } from "@/lib/quote-document";
import { deliveryEventSummary } from "@/lib/delivery-events";
import { SMS_ENABLED } from "@/lib/feature-flags";
import type { DeliveryEvent, PricingRecommendationSnapshot, PropertyValuationSnapshot, Quote, QuoteLineItem, QuoteTemplatePreset } from "@/types";
import { getQuoteWorkflowState, type QuoteReadinessItem } from "@/components/quotes/quote-workflow-model";

const presets: { value: QuoteTemplatePreset; label: string }[] = [
  { value: "classic", label: "Standard" },
  { value: "modern", label: "Refined" },
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
  const [followingUp, setFollowingUp] = useState(false);
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

  async function handleMarkFollowedUp() {
    if (!quote) return;
    setFollowingUp(true);
    setSendMessage("");
    setSendError("");
    const res = await fetch(`/api/quotes/${quote.id}/follow-up`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setSendError(data.error ?? "Follow-up could not be logged.");
      setFollowingUp(false);
      return;
    }
    applyQuoteResult(await fetchQuote());
    setSendMessage("Follow-up logged. Taskrel will surface this quote again in two days if it is still waiting.");
    setFollowingUp(false);
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
    // SMS is implemented but not launched in v1 (see SMS_ENABLED / TCPA).
    ...(SMS_ENABLED && quote.client_phone ? ["sms"] : []),
  ];
  const deliveryChannels = [
    quote.client_email
      ? { key: "email" as const, label: "Email", recipient: quote.client_email, Icon: EnvelopeSimple }
      : null,
    SMS_ENABLED && quote.client_phone
      ? { key: "sms" as const, label: "SMS", recipient: quote.client_phone, Icon: DeviceMobile }
      : null,
  ].filter((channel): channel is NonNullable<typeof channel> => channel !== null);
  const documentHtml = quote.business_snapshot
    ? renderQuoteDocumentHtml({ quote, business: quote.business_snapshot, preset: previewPreset })
    : "";
  const workflowState = getQuoteWorkflowState(quote);
  const deliverySummary = deliveryEventSummary(quote.delivery_events ?? []);
  const attentionItems = workflowState.readiness.filter(item => !item.complete);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]"
        >
          <ArrowLeft size={20} weight="bold" />
          <span className="sr-only">Back</span>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold text-[var(--tr-text)] md:text-3xl">{quote.client_name}</h1>
          <p className="mt-1 text-base text-[var(--tr-text-muted)]">{workflowState.nextActionDetail}</p>
        </div>
        {(() => {
          const isExpired =
            quote.status === "sent" &&
            quote.valid_until !== null &&
            new Date() > new Date(quote.valid_until);
          return (
            <Badge variant={isExpired ? "warning" : statusVariant(quote.status)}>
              {isExpired ? "Expired" : quote.status}
            </Badge>
          );
        })()}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <aside className="order-2 space-y-4 lg:order-2">
          <ActionRail
            title="Quote total"
            value={formatCurrency(quote.total)}
            badges={
              <>
                <span className="rounded-md bg-[var(--tr-primary-fill)] px-2.5 py-1 text-sm font-semibold text-[var(--tr-primary)] ring-1 ring-[var(--tr-primary-edge)]">
                  {workflowState.nextAction}
                </span>
                <span className={`rounded-md px-2.5 py-1 text-sm font-semibold ${deliveryClass(workflowState.deliveryTone)}`}>
                  {workflowState.deliveryLabel}
                </span>
                {dirty && (
                  <span className="rounded-md bg-[var(--tr-amber)]/12 px-2 py-1 text-sm font-semibold text-[var(--tr-amber)]">
                    Unsaved edits
                  </span>
                )}
              </>
            }
          >
            <div className="divide-y divide-[var(--tr-border-soft)] border-t border-[var(--tr-border-soft)]">
              <DetailLine label="Start Date" value={quote.scheduled_start ? formatDateNumeric(quote.scheduled_start) : "Not scheduled"} />
              <DetailLine label="Delivery" value={quote.sent_via?.length ? quote.sent_via.join(" + ") : "Ready"} />
              <DetailLine label="Follow-up" value={workflowState.followUpLabel ?? "Not needed"} />
              <DetailLine label="Contact" value={quote.client_phone ? "Phone saved" : quote.client_email ? "Email saved" : "Missing"} />
            </div>

            {dirty && (
              <p className="rounded-lg bg-[var(--tr-warning-bg)] p-3 text-sm leading-5 text-[var(--tr-text)] shadow-[inset_0_0_0_1px_var(--tr-badge-warning-ring)]">
                Save pricing changes before sending or converting so the client document matches your latest totals.
              </p>
            )}

            <div className="space-y-3">
              {dirty && (
                <Button variant="secondary" className="w-full" onClick={handleSaveQuote} loading={savingQuote}>
                  <FileText size={18} weight="duotone" />
                  Save pricing changes
                </Button>
              )}
              {quote.status === "approved" && quote.approved_at && (
                <p className="rounded-lg bg-[var(--tr-success-bg)] p-3 text-sm font-semibold text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
                  Approved by {quote.client_name} on {formatDate(quote.approved_at)}.
                </p>
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
              {quote.status === "sent" && (() => {
                const isExpired =
                  quote.status === "sent" &&
                  quote.valid_until !== null &&
                  new Date() > new Date(quote.valid_until);
                return (
                  <>
                    <Button variant="secondary" className="w-full" onClick={() => handleSend(sendVia)} loading={sending} disabled={dirty || sendVia.length === 0}>
                      <EnvelopeSimple size={18} weight="duotone" />
                      {isExpired ? "Resend" : "Resend Quote"}
                    </Button>
                    {isExpired && (
                      <p className="text-sm text-[var(--tr-text-muted)]">
                        Quote expired — resending resets the expiry 30 days.
                      </p>
                    )}
                  </>
                );
              })()}
              {quote.status === "sent" && (
                <Button variant="secondary" className="w-full" onClick={handleMarkFollowedUp} loading={followingUp} disabled={dirty}>
                  <SealCheck size={18} weight="duotone" />
                  Mark followed up
                </Button>
              )}
              {sendVia.length === 0 && (
                <p className="text-sm text-[var(--tr-text-muted)]">Add an email or phone to send this quote.</p>
              )}
              {sendError && (
                <p className="rounded-lg bg-[var(--tr-error-bg)] p-3 text-sm text-[var(--tr-red)] shadow-[inset_0_0_0_1px_var(--tr-badge-warning-ring)]">{sendError}</p>
              )}
              {sendMessage && !sendError && (
                <p className="rounded-lg bg-[var(--tr-success-bg)] p-3 text-sm text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">{sendMessage}</p>
              )}
            </div>
          </ActionRail>

          <Surface className="p-5">
            <h2 className="text-lg font-semibold text-[var(--tr-text)]">
              {attentionItems.length > 0 ? "Needs attention" : "Ready"}
            </h2>
            <p className="mt-1 text-base leading-7 text-[var(--tr-text-muted)]">
              {attentionItems.length > 0
                ? `${attentionItems.length} ${attentionItems.length === 1 ? "item needs" : "items need"} attention before the next step.`
                : "This quote has the basics needed for the next step."}
            </p>
            <div className="mt-4 space-y-2">
              {(attentionItems.length > 0 ? attentionItems : workflowState.readiness.slice(0, 1)).map(item => (
                <ReadinessRow key={item.key} item={item} />
              ))}
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-semibold text-[var(--tr-text)]">Delivery &amp; status</h2>
            <p className="mt-1 text-base leading-7 text-[var(--tr-text-muted)]">
              {deliverySummary.latestSuccessLabel ?? "No successful send recorded yet."}
            </p>

            {deliveryChannels.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--tr-text-muted)]">
                Add a client email or phone number to send this quote.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {deliveryChannels.map(channel => {
                  const last = latestChannelSend(quote.delivery_events ?? [], channel.key);
                  const sentOk = last?.status === "success";
                  const failed = last?.status === "error";
                  const statusTone = sentOk
                    ? "text-[var(--tr-green)]"
                    : failed
                      ? "text-[var(--tr-amber)]"
                      : "text-[var(--tr-text-faint)]";
                  return (
                    <div
                      key={channel.key}
                      className="flex items-center justify-between gap-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className={`mt-0.5 shrink-0 ${statusTone}`}>
                          <channel.Icon size={18} weight="duotone" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--tr-text)]">{channel.label}</p>
                          <p className="truncate text-sm text-[var(--tr-text-muted)]">{channel.recipient}</p>
                          <p className={`mt-0.5 text-sm ${statusTone}`}>
                            {sentOk
                              ? `Sent ${formatDate(last!.created_at)} ${formatTime(last!.created_at)}`
                              : failed
                                ? `Failed — ${last!.message}`
                                : "Not sent yet"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={sentOk ? "secondary" : "primary"}
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleSend([channel.key])}
                        loading={sending}
                        disabled={dirty || sending}
                      >
                        {sentOk ? "Resend" : failed ? "Retry" : "Send"}
                      </Button>
                    </div>
                  );
                })}
                {dirty && (
                  <p className="text-sm text-[var(--tr-text-muted)]">
                    Save pricing changes before sending so the client document matches your latest totals.
                  </p>
                )}
                {quote.archived_document && (
                  <a
                    href={`/api/quotes/${id}/sent-document`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[var(--tr-text-muted)] hover:text-[var(--tr-text)] transition-colors"
                  >
                    <FileText size={15} weight="duotone" />
                    View sent document
                  </a>
                )}
              </div>
            )}
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-semibold text-[var(--tr-text)]">Client</h2>
            <div className="mt-3 space-y-2 text-sm text-[var(--tr-text-muted)]">
              {quote.client_email && <p>{quote.client_email}</p>}
              {quote.client_phone && <p>{quote.client_phone}</p>}
              {quote.client_address && (
                <p className="flex items-start gap-2">
                  <MapPin size={16} weight="duotone" className="mt-0.5 shrink-0 text-[var(--tr-text-faint)]" />
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
            <div className="flex items-center justify-between gap-3 border-b border-[var(--tr-border-soft)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--tr-text-muted)]">Line items</p>
              <button type="button" onClick={addLineItem} className="text-sm font-semibold text-[var(--tr-primary)]">
                Add item
              </button>
            </div>
            <div className="divide-y divide-[var(--tr-border-soft)]">
              {quote.line_items.map((item, index) => (
                <div key={index} className="px-4 py-4">
                  <div className="lg:hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedLineItemIndex(expandedLineItemIndex === index ? null : index)}
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
                        <span className="mt-2 inline-flex rounded-md bg-[var(--tr-primary-fill)] px-2 py-1 text-sm font-semibold text-[var(--tr-primary)] ring-1 ring-[var(--tr-primary-edge)]">
                          {expandedLineItemIndex === index ? "Done" : "Edit"}
                        </span>
                      </span>
                    </button>
                    {expandedLineItemIndex === index && (
                      <div className="mt-3 space-y-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
                        <label className="block">
                          <span className="text-sm font-medium text-[var(--tr-text-muted)]">Description</span>
                          <textarea
                            value={item.description}
                            onChange={event => updateLineItem(index, { description: event.target.value })}
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
                              onChange={event => updateLineItem(index, { quantity: Number(event.target.value) })}
                              className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="text-sm font-medium text-[var(--tr-text-muted)]">Unit</span>
                            <input
                              value={item.unit ?? "unit"}
                              onChange={event => updateLineItem(index, { unit: event.target.value })}
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
                            onChange={event => updateLineItem(index, { unit_price: Number(event.target.value) })}
                            className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                          />
                        </label>
                        <div className="flex items-center justify-between gap-3 border-t border-[var(--tr-border-soft)] pt-3">
                          <p className="text-sm font-semibold text-[var(--tr-text)]">Line total {formatCurrency(item.total)}</p>
                          <button type="button" onClick={() => removeLineItem(index)} className="text-sm font-semibold text-red-300 hover:text-red-200">
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
                        onChange={event => updateLineItem(index, { description: event.target.value })}
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
                        onChange={event => updateLineItem(index, { quantity: Number(event.target.value) })}
                        className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-[var(--tr-text-muted)]">Unit</span>
                      <input
                        value={item.unit ?? "unit"}
                        onChange={event => updateLineItem(index, { unit: event.target.value })}
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
                        onChange={event => updateLineItem(index, { unit_price: Number(event.target.value) })}
                        className="tr-input mt-1 h-10 w-full rounded-lg px-3 text-sm"
                      />
                    </label>
                    <div className="flex items-end justify-between gap-3 lg:block lg:text-right">
                      <div>
                        <p className="text-sm font-medium text-[var(--tr-text-muted)]">Total</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--tr-text)]">{formatCurrency(item.total)}</p>
                      </div>
                      <button type="button" onClick={() => removeLineItem(index)} className="text-sm font-semibold text-red-300 hover:text-red-200">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-[var(--tr-border-soft)] px-4 py-3">
              <div className="flex justify-between text-sm text-[var(--tr-text-muted)]">
                <span>Subtotal</span><span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.tax_amount > 0 && (
                <div className="flex justify-between text-sm text-[var(--tr-text-muted)]">
                  <span>Tax</span><span>{formatCurrency(quote.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-[var(--tr-primary)]">
                <span>Total</span><span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </Surface>

          {quote.notes && (
            <Surface className="p-4">
              <p className="mb-1 text-sm font-semibold text-[var(--tr-text)]">Client note</p>
              <p className="text-sm leading-6 text-[var(--tr-text-muted)]">{quote.notes}</p>
            </Surface>
          )}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--tr-text-muted)]">Client preview</h2>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/quotes/${id}/pdf?preset=${previewPreset}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--tr-border-soft)] px-2.5 py-1.5 text-sm font-semibold text-[var(--tr-text)] hover:bg-[var(--tr-bg-soft)]"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  Download PDF
                </a>
                <div className="flex rounded-lg bg-[var(--tr-bg-soft)] p-1 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
                {presets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => setPreviewPreset(preset.value)}
                    className={`rounded-md px-2.5 py-1.5 text-sm font-semibold ${
                      previewPreset === preset.value ? "bg-[var(--tr-primary-fill)] text-[var(--tr-primary)] shadow-[inset_0_0_0_1px_var(--tr-primary-edge)]" : "text-[var(--tr-text-muted)] hover:text-[var(--tr-text)]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                </div>
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

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="text-[var(--tr-text-muted)]">{label}</span>
      <span className="truncate text-right font-semibold capitalize text-[var(--tr-text)]">{value}</span>
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

function latestChannelSend(events: DeliveryEvent[], channel: DeliveryEvent["channel"]) {
  return [...events]
    .filter(event => event.action === "send" && event.channel === channel)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function deliveryClass(tone: "ready" | "sent" | "missing") {
  if (tone === "sent") return "bg-[var(--tr-badge-success-bg)] text-[var(--tr-badge-success-text)] ring-1 ring-[var(--tr-badge-success-ring)]";
  if (tone === "ready") return "bg-[var(--tr-badge-info-bg)] text-[var(--tr-badge-info-text)] ring-1 ring-[var(--tr-badge-info-ring)]";
  return "bg-[var(--tr-badge-warning-bg)] text-[var(--tr-badge-warning-text)] ring-1 ring-[var(--tr-badge-warning-ring)]";
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
      <h2 className="text-lg font-semibold text-[var(--tr-text)]">Pricing check</h2>
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
        <p className="mt-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 text-sm leading-6 text-[var(--tr-text-muted)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
          {recommendation.property_value_adjustment_reason}
        </p>
      )}

      <div className="mt-5 space-y-3 rounded-lg bg-[var(--tr-bg-soft)] p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
        <div>
          <p className="text-sm font-semibold text-[var(--tr-text)]">Property value</p>
          <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">
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
          <div className="space-y-1 rounded-lg bg-[var(--tr-surface)] p-3 text-sm text-[var(--tr-text-muted)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
            <p><span className="font-semibold text-[var(--tr-text)]">Source:</span> {valuation.source}</p>
            {valuation.normalized_address && <p><span className="font-semibold text-[var(--tr-text)]">Address:</span> {valuation.normalized_address}</p>}
            {(valuation.value_low || valuation.value_high) && (
              <p>
                <span className="font-semibold text-[var(--tr-text)]">Range:</span>{" "}
                {valuation.value_low ? formatCurrency(valuation.value_low) : "Unknown"} - {valuation.value_high ? formatCurrency(valuation.value_high) : "Unknown"}
              </p>
            )}
            {valuation.fetched_at && <p><span className="font-semibold text-[var(--tr-text)]">Fetched:</span> {formatDate(valuation.fetched_at)}</p>}
            <button type="button" onClick={onClear} className="pt-1 text-sm font-semibold text-red-300 hover:text-red-200">
              Clear property value
            </button>
          </div>
        )}
        {propertyError && <p className="text-sm text-red-300">{propertyError}</p>}
        {propertyMessage && !propertyError && <p className="text-sm text-emerald-300">{propertyMessage}</p>}
        {!hasAddress && <p className="text-sm text-[var(--tr-text-muted)]">Add a client address to use RentCast verification.</p>}
      </div>
    </Surface>
  );
}

function PricingRow({
  label,
  value,
  strong,
  tone = "text-[var(--tr-text)]",
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--tr-text-muted)]">{label}</span>
      <span className={`${strong ? "font-semibold" : "font-medium"} ${tone}`}>{value}</span>
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
