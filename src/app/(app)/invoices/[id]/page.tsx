"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/components/ui/icons";
import { ReadinessList } from "@/components/ui/readiness";
import { Surface } from "@/components/ui/surface";
import { getInvoicePaymentReadiness } from "@/lib/readiness/setup-readiness";
import type { Invoice } from "@/types";

type SendDetail = {
  channel: string;
  code: string;
  message: string;
};

type SendResponse = {
  sent: string[];
  errors: string[];
  details: SendDetail[];
  paymentLink: string | null;
  paymentLinkState: "ready" | "created" | "missing_connect" | "stripe_config" | "error";
  error?: string;
};

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const [sendDetails, setSendDetails] = useState<SendDetail[]>([]);
  const [paymentLinkState, setPaymentLinkState] = useState<SendResponse["paymentLinkState"] | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(r => r.json())
      .then(data => {
        setInvoice(data);
        setLoading(false);
      });
  }, [id]);

  async function handleSend() {
    setSending(true);
    setSendMessage("");
    setSendError("");
    setSendDetails([]);
    setPaymentLinkState(null);

    const response = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
    const result = await response.json() as SendResponse;
    setSendDetails(result.details ?? []);
    setPaymentLinkState(result.paymentLinkState ?? null);

    if (!response.ok) {
      setSendError(result.details?.[0]?.message ?? result.error ?? "Invoice could not be sent.");
      setSending(false);
      return;
    }

    setInvoice(current => {
      if (!current) return current;
      return {
        ...current,
        status: result.sent.length > 0 ? "sent" : current.status,
        sent_via: result.sent.length > 0 ? result.sent as Invoice["sent_via"] : current.sent_via,
        stripe_payment_link: result.paymentLink ?? current.stripe_payment_link,
      };
    });

    if (result.details?.length) {
      setSendMessage(result.details[0].message);
    } else {
      setSendMessage("Invoice sent.");
    }

    setSending(false);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#F97316] border-r-transparent" />
      </div>
    );
  }

  if (!invoice) return <div className="p-6 text-slate-400">Invoice not found.</div>;

  const sendgridConfigured = !sendDetails.some(detail => detail.channel === "email" && detail.code === "email_config");
  const twilioConfigured = !sendDetails.some(detail => detail.channel === "sms" && detail.code === "sms_config");
  const readiness = getInvoicePaymentReadiness({
    client_email: invoice.client_email,
    client_phone: invoice.client_phone,
    total: invoice.total,
    stripe_connect_account_id: invoice.stripe_payment_link ? "connected" : null,
    stripe_payment_link: invoice.stripe_payment_link,
    status: invoice.status,
    amount_paid: invoice.amount_paid,
    paid_at: invoice.paid_at,
    sendgridConfigured,
    twilioConfigured,
  });
  const detailMessages = [
    ...(paymentLinkState === "missing_connect" && !sendError
      ? [{ key: "payment-link-missing-connect", message: "Invoice sent without online payment. Set up Stripe Connect to include a payment link." }]
      : []),
    ...sendDetails.map((detail, index) => ({ key: `${detail.channel}-${detail.code}-${index}`, message: detail.message })),
  ];

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="mb-2 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
          <ArrowLeft size={24} weight="bold" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">{invoice.client_name}</h1>
          <p className="text-xs text-slate-400">{invoice.invoice_number}</p>
        </div>
        <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
      </div>

      <Surface className="p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-white">Payment readiness</p>
          <p className="mt-1 text-xs text-slate-400">Check send channels, online payment, and Stripe payment status.</p>
        </div>
        <ReadinessList items={readiness} />
      </Surface>

      <div className="overflow-hidden rounded-xl bg-[#1E293B]">
        <div className="border-b border-slate-700 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Line Items</p>
        </div>
        <div className="divide-y divide-slate-700/50">
          {invoice.line_items.map((item, index) => (
            <div key={index} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="flex-1">
                <p className="text-sm text-white">{item.description}</p>
                <p className="text-xs text-slate-500">{item.quantity} x ${item.unit_price.toFixed(2)}</p>
              </div>
              <p className="text-sm font-medium text-white">${item.total.toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t border-slate-700 px-4 py-3">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal</span>
            <span>${invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between text-sm text-slate-400">
              <span>Tax</span>
              <span>${invoice.tax_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-[#F97316]">
            <span>Total</span>
            <span>${invoice.total.toFixed(2)}</span>
          </div>
          {invoice.amount_paid > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>Paid</span>
              <span>${invoice.amount_paid.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {invoice.stripe_payment_link && invoice.status !== "paid" && (
        <Surface className="p-4">
          <p className="mb-2 text-xs text-slate-400">Payment Link</p>
          <p className="break-all text-sm text-[#F97316]">{invoice.stripe_payment_link}</p>
        </Surface>
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
        {detailMessages.length > 0 && (
          <Surface className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Send details</p>
            <div className="mt-3 space-y-2">
              {detailMessages.map(detail => (
                <p key={detail.key} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-200">
                  {detail.message}
                </p>
              ))}
            </div>
          </Surface>
        )}
      </div>
    </div>
  );
}
