"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { QuoteLineItem, QuoteStatus } from "@/types";
import { Badge, statusVariant } from "@/components/ui/badge";
import { CalendarBlank, EnvelopeSimple, FileText, MapPin } from "@/components/ui/icons";
import { formatCurrency, formatDate } from "@/lib/format";

export type DashboardQuote = {
  id: string;
  client_name: string;
  client_address: string | null;
  status: QuoteStatus;
  line_items: QuoteLineItem[];
  subtotal: number | string;
  tax_amount: number | string;
  total: number | string;
  notes: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  sent_via: ("email" | "sms")[] | null;
  created_at: string;
};

function deliveryMethod(sentVia: DashboardQuote["sent_via"]) {
  if (!sentVia?.length) return "Not sent";
  if (sentVia.includes("email") && sentVia.includes("sms")) return "Email + SMS";
  if (sentVia.includes("email")) return "Email";
  if (sentVia.includes("sms")) return "SMS";
  return "Sent";
}

function nextAction(status: QuoteStatus) {
  switch (status) {
    case "draft":
      return "Review & Send";
    case "sent":
      return "Follow up / Convert";
    case "approved":
      return "Create Invoice";
    case "rejected":
    case "expired":
      return "Review";
  }
}

export function DashboardWorkQueue({ quotes }: { quotes: DashboardQuote[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(quotes[0]?.id ?? null);
  const activeQuotes = useMemo(
    () => quotes.filter(quote => ["draft", "sent", "approved"].includes(quote.status)),
    [quotes],
  );

  if (activeQuotes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--tr-border)] p-8 text-center">
        <FileText size={32} weight="duotone" className="mx-auto mb-3 text-slate-500" />
        <p className="font-semibold text-[var(--tr-text)]">No active quotes</p>
        <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Draft, sent, and approved quotes will appear here.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--tr-border-soft)]">
      {activeQuotes.map(quote => {
        const expanded = expandedId === quote.id;
        const topItems = quote.line_items.slice(0, 3);
        const hiddenItemCount = Math.max(quote.line_items.length - topItems.length, 0);

        return (
          <div key={quote.id} className="py-3 first:pt-0 last:pb-0">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : quote.id)}
              className="flex w-full items-start justify-between gap-4 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--tr-surface-2)]"
              aria-expanded={expanded}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText size={18} weight="duotone" className="shrink-0 text-[var(--tr-primary)]" />
                  <p className="truncate text-sm font-bold text-[var(--tr-text)]">{quote.client_name}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--tr-text-muted)]">
                  <span>{deliveryMethod(quote.sent_via)}</span>
                  <span aria-hidden="true">/</span>
                  <span>{quote.scheduled_start ? formatDate(quote.scheduled_start) : "Not scheduled"}</span>
                  <span aria-hidden="true">/</span>
                  <span className="font-semibold text-[var(--tr-primary)]">{nextAction(quote.status)}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-black text-[var(--tr-text)]">{formatCurrency(quote.total)}</p>
                <Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
              </div>
            </button>

            {expanded && (
              <div className="px-2 pb-2 pt-3">
                {quote.client_address && (
                  <p className="mb-3 flex items-start gap-2 text-sm text-[var(--tr-text-muted)]">
                    <MapPin size={16} weight="duotone" className="mt-0.5 shrink-0 text-[var(--tr-text-faint)]" />
                    <span>{quote.client_address}</span>
                  </p>
                )}

                <div className="overflow-hidden rounded-lg border border-[var(--tr-border-soft)]">
                  <div className="divide-y divide-[var(--tr-border-soft)]">
                    {topItems.map((item, index) => (
                      <div key={`${item.description}-${index}`} className="flex items-start justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--tr-text)]">{item.description}</p>
                          <p className="text-xs text-[var(--tr-text-faint)]">
                            {item.quantity} {item.unit ?? "unit"} x {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-[var(--tr-text)]">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                  {hiddenItemCount > 0 && (
                    <p className="border-t border-[var(--tr-border-soft)] px-3 py-2 text-xs text-[var(--tr-text-muted)]">
                      {hiddenItemCount} more {hiddenItemCount === 1 ? "item" : "items"} in full quote
                    </p>
                  )}
                  <div className="space-y-1 border-t border-[var(--tr-border-soft)] px-3 py-3">
                    <div className="flex justify-between text-sm text-[var(--tr-text-muted)]">
                      <span>Subtotal</span>
                      <span>{formatCurrency(quote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[var(--tr-text-muted)]">
                      <span>Tax</span>
                      <span>{formatCurrency(quote.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-[var(--tr-amber)]">
                      <span>Total</span>
                      <span>{formatCurrency(quote.total)}</span>
                    </div>
                  </div>
                </div>

                {quote.notes && (
                  <div className="mt-3 border-t border-[var(--tr-border-soft)] pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">Client note</p>
                    <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{quote.notes}</p>
                  </div>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <QueueMeta icon={<EnvelopeSimple size={15} weight="duotone" />} label="Delivery" value={deliveryMethod(quote.sent_via)} />
                  <QueueMeta icon={<CalendarBlank size={15} weight="duotone" />} label="Schedule" value={quote.scheduled_start ? formatDate(quote.scheduled_start) : "Not scheduled"} />
                  <QueueMeta icon={<FileText size={15} weight="duotone" />} label="Next" value={nextAction(quote.status)} strong />
                </div>

                <Link
                  href={`/quotes/${quote.id}`}
                  className="tr-primary-action mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-bold sm:w-auto"
                >
                  Open quote
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QueueMeta({
  icon,
  label,
  value,
  strong,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex min-w-0 gap-2 rounded-lg bg-[var(--tr-bg-soft)] p-2">
      <span className="mt-0.5 shrink-0 text-[var(--tr-text-faint)]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--tr-text-faint)]">{label}</span>
        <span className={`block truncate text-xs ${strong ? "font-semibold text-[var(--tr-primary)]" : "text-[var(--tr-text-muted)]"}`}>{value}</span>
      </span>
    </div>
  );
}
