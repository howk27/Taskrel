"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarBlank, DeviceMobile, EnvelopeSimple, FileText, Receipt } from "@/components/ui/icons";
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
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-700 bg-[#172235] text-slate-400 hover:text-white"
        >
          <ArrowLeft size={20} weight="bold" />
          <span className="sr-only">Back</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">Quote</p>
          <h1 className="truncate text-xl font-bold text-white">{quote.client_name}</h1>
          <p className="text-xs text-slate-400">Created {formatDate(quote.created_at)}</p>
        </div>
        <Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Surface className="p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <FileText size={15} weight="duotone" />
            Total
          </p>
          <p className="mt-1 text-xl font-bold text-white">{formatCurrency(quote.total)}</p>
        </Surface>
        <Surface className="p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CalendarBlank size={15} weight="duotone" />
            Scheduled
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{quote.scheduled_start ? formatDate(quote.scheduled_start) : "Not scheduled"}</p>
        </Surface>
      </div>

      <Surface className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery</p>
            <p className="mt-1 text-sm text-white">
              {quote.sent_via?.length ? quote.sent_via.join(" + ") : "Ready to send"}
            </p>
          </div>
          <div className="flex gap-2 text-slate-500">
            <EnvelopeSimple size={20} weight="duotone" />
            <DeviceMobile size={20} weight="duotone" />
          </div>
        </div>
      </Surface>

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
          <div className="flex justify-between text-base font-bold text-[#F97316]">
            <span>Total</span><span>{formatCurrency(quote.total)}</span>
          </div>
        </div>
      </Surface>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client preview</h2>
          <div className="flex rounded-lg bg-slate-800 p-1">
            {presets.map(preset => (
              <button
                key={preset.value}
                onClick={() => setPreviewPreset(preset.value)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${
                  previewPreset === preset.value ? "bg-[#F97316] text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-700 bg-white">
          <div className="max-h-[620px] overflow-auto p-3">
            <div dangerouslySetInnerHTML={{ __html: documentHtml }} />
          </div>
        </div>
      </section>

      <div className="space-y-3 pt-1">
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
      </div>
    </div>
  );
}
