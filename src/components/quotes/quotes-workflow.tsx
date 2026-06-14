"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { Quote, QuoteStatus } from "@/types";
import { Badge, statusVariant } from "@/components/ui/badge";
import { CalendarBlank, DeviceMobile, EnvelopeSimple, FileText, MagnifyingGlass, MapPin, Plus } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";

type QuoteListItem = Pick<
  Quote,
  | "id"
  | "client_name"
  | "client_address"
  | "total"
  | "status"
  | "created_at"
  | "updated_at"
  | "scheduled_start"
  | "sent_via"
>;

type FilterKey = "active" | "draft" | "sent" | "approved" | "archived";

const filters: { key: FilterKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "draft", label: "Drafts" },
  { key: "sent", label: "Sent" },
  { key: "approved", label: "Approved" },
  { key: "archived", label: "Archived" },
];

function filterQuote(status: QuoteStatus, filter: FilterKey) {
  if (filter === "active") return status === "draft" || status === "sent";
  if (filter === "archived") return status === "expired" || status === "rejected";
  return status === filter;
}

function nextAction(status: QuoteStatus) {
  switch (status) {
    case "draft":
      return "Review & Send";
    case "sent":
      return "Resend / Convert";
    case "approved":
      return "Create Invoice";
    case "expired":
    case "rejected":
      return "Duplicate or Archive";
  }
}

function deliveryMethod(sentVia: QuoteListItem["sent_via"]) {
  if (!sentVia?.length) return "Not sent";
  if (sentVia.includes("email") && sentVia.includes("sms")) return "Email + SMS";
  if (sentVia.includes("email")) return "Email";
  if (sentVia.includes("sms")) return "SMS";
  return "Sent";
}

export function QuotesWorkflow({ quotes }: { quotes: QuoteListItem[] }) {
  const [filter, setFilter] = useState<FilterKey>("active");
  const [search, setSearch] = useState("");

  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotes.filter(quote => {
      if (!filterQuote(quote.status, filter)) return false;
      if (!term) return true;
      return [quote.client_name, quote.client_address, quote.status]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    });
  }, [filter, quotes, search]);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <PageHeader
        title="Quotes"
        subtitle="Draft, send, follow up, and convert contractor quotes."
        action={(
          <Link
            href="/quotes/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F97316] px-3.5 text-sm font-semibold text-white hover:bg-[#EA6C0A]"
          >
            <Plus size={18} weight="bold" />
            New
          </Link>
        )}
      />

      <Surface className="p-3">
        <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-700 bg-[#0F172A] px-3">
          <MagnifyingGlass size={18} className="text-slate-500" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search client, address, status"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
          />
        </label>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {filters.map(item => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                filter === item.key
                  ? "bg-[#F97316] text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Surface>

      {filteredQuotes.length > 0 ? (
        <div className="space-y-3">
          {filteredQuotes.map(quote => (
            <Link key={quote.id} href={`/quotes/${quote.id}`} className="block">
              <Surface className="p-4 transition-colors hover:border-slate-500/80 hover:bg-[#1B2940]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={18} weight="duotone" className="shrink-0 text-[#F97316]" />
                      <p className="truncate text-sm font-semibold text-white">{quote.client_name}</p>
                    </div>
                    {quote.client_address && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                        <MapPin size={14} weight="duotone" className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{quote.client_address}</span>
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold text-white">{formatCurrency(quote.total)}</p>
                    <Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-700/70 pt-3 text-xs">
                  <Meta icon={<CalendarBlank size={15} weight="duotone" />} label="Created" value={formatDate(quote.created_at)} />
                  <Meta icon={<EnvelopeSimple size={15} weight="duotone" />} label="Delivery" value={deliveryMethod(quote.sent_via)} />
                  <Meta icon={<DeviceMobile size={15} weight="duotone" />} label="Next" value={nextAction(quote.status)} strong />
                  <Meta
                    icon={<CalendarBlank size={15} weight="duotone" />}
                    label="Scheduled"
                    value={quote.scheduled_start ? formatDate(quote.scheduled_start) : "Not scheduled"}
                  />
                </div>
              </Surface>
            </Link>
          ))}
        </div>
      ) : (
        <Surface className="p-8 text-center">
          <FileText size={32} weight="duotone" className="mx-auto mb-3 text-slate-500" />
          <p className="text-sm font-semibold text-white">No quotes in this view</p>
          <p className="mt-1 text-sm text-slate-400">Create a quote or switch filters to see other work.</p>
          <Link
            href="/quotes/new"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#F97316] px-4 text-sm font-semibold text-white hover:bg-[#EA6C0A]"
          >
            <Plus size={18} weight="bold" />
            New Quote
          </Link>
        </Surface>
      )}
    </div>
  );
}

function Meta({
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
    <div className="flex min-w-0 gap-2 rounded-lg bg-slate-950/30 p-2">
      <span className="mt-0.5 shrink-0 text-slate-500">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`block truncate ${strong ? "font-semibold text-[#F97316]" : "text-slate-300"}`}>{value}</span>
      </span>
    </div>
  );
}
