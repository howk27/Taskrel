"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Receipt } from "@/components/ui/icons";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { getInvoiceWorkflowState } from "@/lib/workflows/invoice-workflow";
import { deliveryEventSummary } from "@/lib/delivery-events";
import type { Invoice } from "@/types";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const fetchInvoice = useCallback(async () => {
    const response = await fetch(`/api/invoices/${id}`);
    if (!response.ok) {
      return null;
    }
    return await response.json() as Invoice;
  }, [id]);

  useEffect(() => {
    let ignore = false;
    fetchInvoice().then(data => {
      if (ignore) return;
      setInvoice(data);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [fetchInvoice]);

  const workflow = useMemo(() => invoice ? getInvoiceWorkflowState(invoice) : null, [invoice]);
  const deliverySummary = useMemo(() => invoice ? deliveryEventSummary(invoice.delivery_events ?? []) : null, [invoice]);

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
    setSendMessage(result.details?.[0]?.message ?? "Invoice sent.");
    setSending(false);
    setInvoice(await fetchInvoice());
    router.refresh();
  }

  async function handleCopyPaymentLink() {
    if (!invoice?.stripe_payment_link) return;
    await navigator.clipboard.writeText(invoice.stripe_payment_link);
    setCopyMessage("Payment link copied.");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-8 xl:py-8">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white/10" />
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Surface className="h-72 animate-pulse p-5" />
          <Surface className="h-72 animate-pulse p-5" />
        </div>
      </div>
    );
  }

  if (!invoice || !workflow) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Surface className="p-8 text-center">
          <p className="font-semibold text-white">Invoice not found</p>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">This invoice may have been removed or you may not have access.</p>
          <Link href="/invoices" className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f]">
            Back to invoices
          </Link>
        </Surface>
      </div>
    );
  }

  const canSend = ["draft", "sent", "overdue"].includes(workflow.effectiveStatus);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--tr-border)] text-[var(--tr-text-muted)] hover:bg-white/5 hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft size={21} weight="bold" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-white md:text-3xl">{invoice.client_name}</h1>
              <Badge variant={statusVariant(workflow.effectiveStatus)}>{workflow.effectiveStatus}</Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{invoice.invoice_number} / {workflow.nextActionDetail}</p>
          </div>
        </div>
        <Link href="/invoices" className="hidden h-10 items-center rounded-lg border border-[var(--tr-border)] px-3 text-sm font-semibold text-white hover:bg-white/5 sm:inline-flex">
          All invoices
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_390px]">
        <div className="space-y-4">
          <Surface className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--tr-text-muted)]">Balance due</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-white tabular-nums">{formatCurrency(workflow.balanceDue)}</p>
                <p className="mt-2 text-sm text-[var(--tr-text-muted)]">Invoice total {formatCurrency(invoice.total)} / paid {formatCurrency(invoice.amount_paid)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-950/30 px-4 py-3 sm:min-w-52">
                <p className="text-xs font-semibold text-[var(--tr-text-faint)]">Next action</p>
                <p className="mt-1 text-lg font-bold text-white">{workflow.nextAction}</p>
              </div>
            </div>
          </Surface>

          <Surface className="overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="text-base font-bold text-white">Line items</h2>
            </div>
            <div className="divide-y divide-white/10">
              {invoice.line_items.map((item, index) => (
                <div key={`${item.description}-${index}`} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.description}</p>
                    <p className="mt-1 text-xs text-[var(--tr-text-faint)]">
                      {item.quantity} {item.unit ?? "unit"} x {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-white">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-white/10 px-4 py-4">
              <TotalRow label="Subtotal" value={invoice.subtotal} />
              {invoice.tax_amount > 0 && <TotalRow label="Tax" value={invoice.tax_amount} />}
              <TotalRow label="Total" value={invoice.total} strong />
              {invoice.amount_paid > 0 && <TotalRow label="Paid" value={invoice.amount_paid} success />}
            </div>
          </Surface>
        </div>

        <div className="space-y-4">
          <Surface className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--tr-green)]/15 text-[var(--tr-green)]">
                <Receipt size={23} weight="duotone" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">Payment command</h2>
                <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{workflow.paymentLabel}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {workflow.proof.map(item => (
                <ProofRow key={item.key} label={item.label} detail={item.detail} />
              ))}
              {deliverySummary?.latestSuccessLabel && (
                <ProofRow label={deliverySummary.latestSuccessLabel} detail="Delivery proof is saved in Taskrel." />
              )}
              {(invoice.delivery_events ?? []).slice(0, 4).map(event => (
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
              {workflow.proof.length === 0 && (
                <p className="rounded-lg border border-dashed border-[var(--tr-border)] p-4 text-sm text-[var(--tr-text-muted)]">
                  No delivery or payment proof yet.
                </p>
              )}
            </div>

            {invoice.stripe_payment_link && workflow.effectiveStatus !== "paid" && (
              <div className="mt-5 space-y-2">
                <a
                  href={invoice.stripe_payment_link}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-[var(--tr-border)] bg-slate-950/30 p-3 text-sm font-semibold text-[var(--tr-blue)] break-all hover:bg-white/[0.04]"
                >
                  {invoice.stripe_payment_link}
                </a>
                <button
                  type="button"
                  onClick={handleCopyPaymentLink}
                  className="h-10 w-full rounded-lg border border-[var(--tr-border)] bg-[var(--tr-surface-2)] px-3 text-sm font-semibold text-white hover:bg-[var(--tr-surface-3)]"
                >
                  Copy payment link
                </button>
                {copyMessage && <p className="text-sm text-emerald-200">{copyMessage}</p>}
              </div>
            )}

            <div className="mt-5 space-y-3">
              {canSend && (
                <Button className="w-full" onClick={handleSend} loading={sending} disabled={workflow.blockers.some(blocker => blocker.key === "contact" || blocker.key === "total")}>
                  {workflow.effectiveStatus === "draft" ? "Send Invoice" : "Resend Invoice"}
                </Button>
              )}
              {sendError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{sendError}</p>
              )}
              {sendMessage && !sendError && (
                <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">{sendMessage}</p>
              )}
            </div>
          </Surface>

          {workflow.blockers.length > 0 && (
            <Surface className="p-5">
              <h2 className="text-base font-bold text-white">Before sending</h2>
              <div className="mt-4 space-y-3">
                {workflow.blockers.map(blocker => (
                  <div key={blocker.key} className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
                    <p className="text-sm font-semibold text-amber-100">{blocker.label}</p>
                    <p className="mt-1 text-sm text-amber-100/80">{blocker.detail}</p>
                  </div>
                ))}
              </div>
            </Surface>
          )}
        </div>
      </section>
    </div>
  );
}

function ProofRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <CheckCircle size={18} weight="duotone" className="mt-0.5 shrink-0 text-[var(--tr-green)]" />
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--tr-text-muted)]">{detail}</p>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
  success,
}: {
  label: string;
  value: number | string;
  strong?: boolean;
  success?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-lg font-black text-white" : success ? "text-sm font-semibold text-[var(--tr-green)]" : "text-sm text-[var(--tr-text-muted)]"}`}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
