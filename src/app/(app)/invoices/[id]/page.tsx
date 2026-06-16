"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";
import type { Invoice } from "@/types";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(r => r.json())
      .then(data => { setInvoice(data); setLoading(false); });
  }, [id]);

  async function handleSend() {
    setSending(true);
    setSendMessage("");
    setSendError("");
    const response = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) {
      setSendError(result.details?.[0]?.message ?? result.error ?? "Invoice could not be sent.");
      setSending(false);
      return;
    }
    if (result.details?.length) {
      setSendMessage(result.details[0].message);
    } else {
      setSendMessage("Invoice sent.");
    }
    setSending(false);
    router.refresh();
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#F97316] border-r-transparent" />
    </div>
  );

  if (!invoice) return <div className="p-6 text-slate-400">Invoice not found.</div>;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
          <ArrowLeft size={24} weight="bold" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">{invoice.client_name}</h1>
          <p className="text-slate-400 text-xs">{invoice.invoice_number}</p>
        </div>
        <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
      </div>

      {/* Line items */}
      <div className="rounded-xl bg-[#1E293B] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Line Items</p>
        </div>
        <div className="divide-y divide-slate-700/50">
          {invoice.line_items.map((item, i) => (
            <div key={i} className="px-4 py-3 flex justify-between items-start gap-4">
              <div className="flex-1">
                <p className="text-white text-sm">{item.description}</p>
                <p className="text-slate-500 text-xs">{item.quantity} x ${item.unit_price.toFixed(2)}</p>
              </div>
              <p className="text-white font-medium text-sm">${item.total.toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-700 space-y-1">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal</span><span>${invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between text-sm text-slate-400">
              <span>Tax</span><span>${invoice.tax_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-[#F97316]">
            <span>Total</span><span>${invoice.total.toFixed(2)}</span>
          </div>
          {invoice.amount_paid > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>Paid</span><span>${invoice.amount_paid.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {invoice.stripe_payment_link && invoice.status !== "paid" && (
        <div className="rounded-xl bg-[#1E293B] p-4">
          <p className="text-xs text-slate-400 mb-2">Payment Link</p>
          <p className="text-[#F97316] text-sm break-all">{invoice.stripe_payment_link}</p>
        </div>
      )}

      <div className="space-y-3 pt-2">
        {(invoice.status === "draft" || invoice.status === "sent") && (
          <Button className="w-full" onClick={handleSend} loading={sending}>
            {invoice.status === "draft" ? "Send Invoice" : "Resend Invoice"}
          </Button>
        )}
        {sendError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{sendError}</p>
        )}
        {sendMessage && !sendError && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{sendMessage}</p>
        )}
      </div>
    </div>
  );
}
