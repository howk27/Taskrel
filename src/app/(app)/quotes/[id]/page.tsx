"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/types";

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then(r => r.json())
      .then(data => { setQuote(data); setLoading(false); });
  }, [id]);

  async function handleSend(via: string[]) {
    setSending(true);
    await fetch("/api/quotes/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: id, via }),
    });
    setSending(false);
    router.refresh();
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
    return <div className="flex items-center justify-center min-h-[60vh]">
      <svg className="animate-spin h-8 w-8 text-[#F97316]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>;
  }

  if (!quote) return <div className="p-6 text-slate-400">Quote not found.</div>;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">{quote.client_name}</h1>
          <p className="text-slate-400 text-xs">{new Date(quote.created_at).toLocaleDateString()}</p>
        </div>
        <Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
      </div>

      {quote.client_address && (
        <div className="rounded-xl bg-[#1E293B] p-4">
          <p className="text-xs text-slate-400 mb-0.5">Address</p>
          <p className="text-white text-sm">{quote.client_address}</p>
        </div>
      )}

      {/* Line items */}
      <div className="rounded-xl bg-[#1E293B] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Line Items</p>
        </div>
        <div className="divide-y divide-slate-700/50">
          {quote.line_items.map((item, i) => (
            <div key={i} className="px-4 py-3 flex justify-between items-start gap-4">
              <div className="flex-1">
                <p className="text-white text-sm">{item.description}</p>
                <p className="text-slate-500 text-xs">{item.quantity} × ${item.unit_price.toFixed(2)}</p>
              </div>
              <p className="text-white font-medium text-sm">${item.total.toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-700 space-y-1">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal</span><span>${quote.subtotal.toFixed(2)}</span>
          </div>
          {quote.tax_amount > 0 && (
            <div className="flex justify-between text-sm text-slate-400">
              <span>Tax</span><span>${quote.tax_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-[#F97316]">
            <span>Total</span><span>${quote.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {quote.notes && (
        <div className="rounded-xl bg-[#1E293B] p-4">
          <p className="text-xs text-slate-400 mb-1">Notes</p>
          <p className="text-slate-300 text-sm">{quote.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 pt-2">
        {quote.status === "approved" && (
          <Button className="w-full" onClick={handleConvertToInvoice} loading={converting}>
            Convert to Invoice
          </Button>
        )}
        {quote.status === "draft" && (
          <Button className="w-full" onClick={() => {
            const via = [];
            if (quote.client_email) via.push("email");
            if (quote.client_phone) via.push("sms");
            handleSend(via);
          }} loading={sending}>
            Send Quote
          </Button>
        )}
        {quote.status === "sent" && (
          <Button variant="secondary" className="w-full" onClick={() => {
            const via = [];
            if (quote.client_email) via.push("email");
            if (quote.client_phone) via.push("sms");
            handleSend(via);
          }} loading={sending}>
            Resend Quote
          </Button>
        )}
      </div>
    </div>
  );
}
