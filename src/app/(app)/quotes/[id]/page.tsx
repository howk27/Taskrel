"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarBlank, DeviceMobile, EnvelopeSimple, FileText, MapPin, Receipt } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";
import { renderQuoteDocumentHtml } from "@/lib/quote-document";
import type { Quote, QuoteTemplatePreset } from "@/types";

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

  const fetchQuote = useCallback(async () => {
    const response = await fetch(`/api/quotes/${id}`);
    const data = await response.json();
    return { ok: response.ok, data };
  }, [id]);

  const applyQuoteResult = useCallback((result: { ok: boolean; data: Quote }) => {
    setQuote(result.ok ? result.data : null);
    if (result.ok) setPreviewPreset(result.data.template_preset ?? "classic");
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
    await fetch("/api/quotes/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: id, via }),
    });
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

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-700 bg-[#172235] text-slate-400 hover:text-white"
        >
          <ArrowLeft size={20} weight="bold" />
          <span className="sr-only">Back</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-blue)]">Quote</p>
          <h1 className="truncate text-2xl font-bold text-white md:text-3xl">{quote.client_name}</h1>
          <p className="text-sm text-[var(--tr-text-muted)]">Created {formatDate(quote.created_at)}</p>
        </div>
        <Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <aside className="space-y-4 lg:order-2">
          <Surface className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">Quote total</p>
            <p className="mt-2 text-4xl font-black tracking-tight text-white">{formatCurrency(quote.total)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <SummaryMeta icon={<FileText size={15} weight="duotone" />} label="Status" value={quote.status} />
              <SummaryMeta icon={<CalendarBlank size={15} weight="duotone" />} label="Scheduled" value={quote.scheduled_start ? formatDate(quote.scheduled_start) : "Not scheduled"} />
              <SummaryMeta icon={<EnvelopeSimple size={15} weight="duotone" />} label="Delivery" value={quote.sent_via?.length ? quote.sent_via.join(" + ") : "Ready"} />
              <SummaryMeta icon={<DeviceMobile size={15} weight="duotone" />} label="Contact" value={quote.client_phone ? "Phone saved" : quote.client_email ? "Email saved" : "Missing"} />
            </div>
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-bold text-white">Actions</h2>
            <div className="mt-4 space-y-3">
              {["draft", "sent", "approved"].includes(quote.status) && (
                <Button className="w-full" onClick={handleConvertToInvoice} loading={converting}>
                  <Receipt size={18} weight="duotone" />
                  {quote.status === "approved" ? "Create Invoice" : "Approve & Convert"}
                </Button>
              )}
              {quote.status === "draft" && (
                <Button className="w-full" onClick={() => handleSend(sendVia)} loading={sending} disabled={sendVia.length === 0}>
                  <EnvelopeSimple size={18} weight="duotone" />
                  Send Quote
                </Button>
              )}
              {quote.status === "sent" && (
                <Button variant="secondary" className="w-full" onClick={() => handleSend(sendVia)} loading={sending} disabled={sendVia.length === 0}>
                  <EnvelopeSimple size={18} weight="duotone" />
                  Resend Quote
                </Button>
              )}
              {sendVia.length === 0 && (
                <p className="text-sm text-[var(--tr-text-muted)]">Add an email or phone to send this quote.</p>
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
        </aside>

        <main className="space-y-5 lg:order-1">
          <Surface className="overflow-hidden">
            <div className="border-b border-slate-700/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Line items</p>
            </div>
            <div className="divide-y divide-slate-700/50">
              {quote.line_items.map((item, index) => (
                <div key={index} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{item.description}</p>
                    <p className="text-xs text-slate-500">{item.quantity} {item.unit ?? "unit"} x {formatCurrency(item.unit_price)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-white">{formatCurrency(item.total)}</p>
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
            <div className="overflow-hidden rounded-lg border border-slate-700 bg-white">
              <div className="max-h-[720px] overflow-auto p-3">
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
