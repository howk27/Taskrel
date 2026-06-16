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
import { ChartCard, PipelineDonut, ValueBarChart } from "@/components/charts/taskrel-charts";

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
  const selectedQuote = filteredQuotes[0] ?? quotes[0];
  const pipelineData = useMemo(() => {
    return ["draft", "sent", "approved", "rejected", "expired"].map(status => ({
      label: status[0].toUpperCase() + status.slice(1),
      value: quotes.filter(quote => quote.status === status).reduce((sum, quote) => sum + Number(quote.total ?? 0), 0),
      secondary: quotes.filter(quote => quote.status === status).length,
    }));
  }, [quotes]);
  const stageCountData = pipelineData.map(point => ({ ...point, value: point.secondary ?? 0 }));

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        eyebrow="Quote workflow"
        title="Quotes"
        subtitle="Track quote value, follow up with clients, and move approved work toward invoices."
        action={(
          <Link
            href="/quotes/new"
            className="hidden h-11 items-center gap-2 rounded-xl bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f] hover:bg-[#a9c6ff] sm:inline-flex"
          >
            <Plus size={18} weight="bold" />
            New
          </Link>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Quote value by stage" subtitle="Where money is sitting in the pipeline">
          <PipelineDonut data={pipelineData} />
        </ChartCard>
        <ChartCard title="Quote count by stage" subtitle="How many work items need attention">
          <ValueBarChart data={stageCountData} currency={false} />
        </ChartCard>
      </div>

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
                  ? "bg-[var(--tr-blue)] text-[#09204f]"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Surface>

      {filteredQuotes.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_390px]">
          <div className="space-y-3">
            {filteredQuotes.map(quote => (
              <Link key={quote.id} href={`/quotes/${quote.id}`} className="block">
                <Surface className="p-3 transition-colors hover:border-slate-500/80 hover:bg-[#1B2940] sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText size={17} weight="duotone" className="shrink-0 text-[var(--tr-blue)]" />
                        <p className="truncate text-sm font-bold text-white sm:text-base">{quote.client_name}</p>
                      </div>
                      {quote.client_address && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-[var(--tr-text-muted)]">
                          <MapPin size={14} weight="duotone" className="mt-0.5 shrink-0 text-[var(--tr-text-faint)]" />
                          <span className="line-clamp-1 sm:line-clamp-2">{quote.client_address}</span>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-black tracking-tight text-white">{formatCurrency(quote.total)}</p>
                      <div className="mt-1"><Badge variant={statusVariant(quote.status)}>{quote.status}</Badge></div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-white/8 bg-slate-950/25 p-2.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--tr-text-muted)]">
                        <EnvelopeSimple size={14} weight="duotone" className="shrink-0 text-[var(--tr-text-faint)]" />
                        <span className="truncate">{deliveryMethod(quote.sent_via)}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[var(--tr-text-muted)]">
                        <CalendarBlank size={14} weight="duotone" className="text-[var(--tr-text-faint)]" />
                        {quote.scheduled_start ? formatDate(quote.scheduled_start) : formatDate(quote.created_at)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/8 pt-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[var(--tr-blue)]">
                        <DeviceMobile size={14} weight="duotone" className="shrink-0" />
                        <span className="truncate">{nextAction(quote.status)}</span>
                      </span>
                      <span className="text-xs font-semibold text-white/80">Open</span>
                    </div>
                  </div>
                </Surface>
              </Link>
            ))}
          </div>
          {selectedQuote && (
            <Surface className="hidden h-fit p-5 xl:block">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tr-text-faint)]">Selected quote</p>
              <h2 className="mt-3 text-2xl font-black text-white">{selectedQuote.client_name}</h2>
              <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{selectedQuote.client_address ?? "No address saved"}</p>
              <p className="mt-6 text-4xl font-black tracking-tight text-white">{formatCurrency(selectedQuote.total)}</p>
              <div className="mt-3"><Badge variant={statusVariant(selectedQuote.status)}>{selectedQuote.status}</Badge></div>
              <div className="mt-6 space-y-3">
                <Meta icon={<EnvelopeSimple size={15} weight="duotone" />} label="Delivery" value={deliveryMethod(selectedQuote.sent_via)} />
                <Meta icon={<CalendarBlank size={15} weight="duotone" />} label="Created" value={formatDate(selectedQuote.created_at)} />
                <Meta icon={<DeviceMobile size={15} weight="duotone" />} label="Next action" value={nextAction(selectedQuote.status)} strong />
              </div>
              <Link href={`/quotes/${selectedQuote.id}`} className="mt-6 flex h-11 items-center justify-center rounded-xl bg-[var(--tr-blue)] text-sm font-bold text-[#09204f]">
                Open quote
              </Link>
            </Surface>
          )}
        </div>
      ) : (
        <Surface className="p-8 text-center">
          <FileText size={32} weight="duotone" className="mx-auto mb-3 text-slate-500" />
          <p className="text-sm font-semibold text-white">No quotes in this view</p>
          <p className="mt-1 text-sm text-slate-400">Create a quote or switch filters to see other work.</p>
          <Link
            href="/quotes/new"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f]"
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
        <span className={`block truncate ${strong ? "font-semibold text-[var(--tr-blue)]" : "text-slate-300"}`}>{value}</span>
      </span>
    </div>
  );
}
