"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { QuoteLineItem, QuoteStatus } from "@/types";
import { Badge, statusVariant } from "@/components/ui/badge";
import {
  CalendarBlank,
  CheckCircle,
  DeviceMobile,
  FileText,
  MagnifyingGlass,
  MapPin,
  Plus,
  SealCheck,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";
import { emptyStateFor } from "@/lib/readiness/setup-readiness";
import { ChartCard, PipelineDonut, ValueBarChart } from "@/components/charts/taskrel-charts";
import {
  getQuoteWorkflowState,
  getQuoteWorkflowSummary,
  type QuoteWorkflowBucket,
  workflowBucketOptions,
} from "@/components/quotes/quote-workflow-model";

type QuoteListItem = {
  id: string;
  client_name: string;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
  total: number;
  status: QuoteStatus;
  created_at: string;
  updated_at: string | null;
  scheduled_start: string | null;
  sent_via: ("email" | "sms")[] | null;
  line_items: QuoteLineItem[] | null;
  notes: string | null;
};

const filters = workflowBucketOptions();

export function QuotesWorkflow({ quotes }: { quotes: QuoteListItem[] }) {
  const [filter, setFilter] = useState<QuoteWorkflowBucket>("needs_review");
  const [search, setSearch] = useState("");

  const summaries = useMemo(() => getQuoteWorkflowSummary(quotes), [quotes]);
  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return quotes.filter(quote => {
      const state = getQuoteWorkflowState(quote);
      if (state.bucket !== filter) return false;
      if (!term) return true;
      return [
        quote.client_name,
        quote.client_address,
        quote.client_email,
        quote.client_phone,
        quote.status,
        state.nextAction,
        state.deliveryLabel,
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    });
  }, [filter, quotes, search]);

  const selectedQuote = filteredQuotes[0] ?? quotes[0];
  const selectedState = selectedQuote ? getQuoteWorkflowState(selectedQuote) : null;
  const empty = filteredQuotes.length === 0 && search.trim() ? emptyStateFor("quote_results") : emptyStateFor("quotes");
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
        title="Quotes"
        subtitle="Review drafts, follow up on sent quotes, and turn approved work into invoices."
        action={(
          <Link
            href="/quotes/new"
            className="tr-primary-action hidden h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold sm:inline-flex"
          >
            <Plus size={18} weight="bold" />
            New quote
          </Link>
        )}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Quote workflow summary">
        {summaries.map(summary => {
          const active = summary.key === filter;
          return (
            <button
              key={summary.key}
              type="button"
              onClick={() => setFilter(summary.key)}
              className={`min-h-[132px] rounded-xl p-4 text-left transition-colors ${
                active
                  ? "tr-primary-action text-[var(--tr-primary)]"
                  : "bg-[var(--tr-surface)] text-[var(--tr-text)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)] hover:bg-[var(--tr-surface-2)]"
              }`}
            >
              <span className="text-sm font-bold">{summary.label}</span>
              <span className={`mt-1 block text-xs ${active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-muted)]"}`}>
                {summary.actionLabel}
              </span>
              <span className="mt-4 flex items-end justify-between gap-3">
                <span>
                  <span className="block text-3xl font-black tabular-nums">{summary.count}</span>
                  <span className={`text-xs font-semibold ${active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"}`}>
                    quote{summary.count === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-lg font-black tabular-nums">{formatCurrency(summary.total)}</span>
                  <span className={`text-xs font-semibold ${active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"}`}>
                    value
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <Surface className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="tr-input flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-3">
            <MagnifyingGlass size={18} className="text-[var(--tr-text-faint)]" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search client, address, contact, or status"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--tr-text)] placeholder:text-[var(--tr-text-faint)] focus:outline-none"
            />
          </label>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {filters.map(item => {
              const active = filter === item.key;
              const count = summaries.find(summary => summary.key === item.key)?.count ?? 0;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors ${
                    active
                      ? "tr-primary-action text-[var(--tr-primary)]"
                      : "bg-[var(--tr-surface-2)] text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-3)] hover:text-[var(--tr-text)]"
                  }`}
                >
                  {item.shortLabel}
                  <span className={`rounded-full px-1.5 py-0.5 tabular-nums ${active ? "bg-[var(--tr-primary-fill-hover)]" : "bg-[var(--tr-bg-soft)]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Surface>

      {filteredQuotes.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_390px]">
          <div className="space-y-3">
            {filteredQuotes.map(quote => (
              <QuoteCard key={quote.id} quote={quote} />
            ))}
          </div>

          {selectedQuote && selectedState && (
            <Surface className="hidden h-fit p-5 xl:block">
              <p className="text-sm font-bold text-[var(--tr-primary)]">{selectedState.bucketLabel}</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--tr-text)]">{selectedQuote.client_name}</h2>
              <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">
                {selectedQuote.client_address ?? "No address saved"}
              </p>
              <p className="mt-5 text-4xl font-black tracking-tight text-[var(--tr-text)] tabular-nums">{formatCurrency(selectedQuote.total)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(selectedQuote.status)}>{selectedQuote.status}</Badge>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${deliveryClass(selectedState.deliveryTone)}`}>
                  {selectedState.deliveryLabel}
                </span>
              </div>

              <div className="mt-5 space-y-2">
                {selectedState.readiness.map(item => (
                  <ReadinessRow key={item.key} complete={item.complete} label={item.label} detail={item.detail} />
                ))}
              </div>

              <Link
                href={`/quotes/${selectedQuote.id}`}
                className="tr-primary-action mt-5 flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold"
              >
                <DeviceMobile size={18} weight="duotone" />
                {selectedState.nextAction}
              </Link>
            </Surface>
          )}
        </div>
      ) : (
        <Surface className="p-8 text-center">
          <FileText size={34} weight="duotone" className="mx-auto mb-3 text-[var(--tr-text-faint)]" />
          <p className="text-base font-bold text-[var(--tr-text)]">{empty.title}</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--tr-text-muted)]">
            {empty.body}
          </p>
          {empty.href ? (
            <Link
              href={empty.href}
              className="tr-primary-action mt-5 inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold"
            >
              <Plus size={18} weight="bold" />
              {empty.actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="tr-primary-action mt-5 inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold"
            >
              <Plus size={18} weight="bold" />
              {empty.actionLabel}
            </button>
          )}
        </Surface>
      )}

      {quotes.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--tr-text)]">Pipeline insight</h2>
            <p className="text-sm leading-6 text-[var(--tr-text-muted)]">
              A quick read on value and volume after the active work queue is handled.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Quote value by stage" subtitle="Where money is sitting in the pipeline">
              <PipelineDonut data={pipelineData} />
            </ChartCard>
            <ChartCard title="Quote count by stage" subtitle="How many work items need attention">
              <ValueBarChart data={stageCountData} currency={false} />
            </ChartCard>
          </div>
        </section>
      )}
    </div>
  );
}

function QuoteCard({ quote }: { quote: QuoteListItem }) {
  const state = getQuoteWorkflowState(quote);
  const blockers = state.readiness.filter(item => !item.complete);
  const hasBlocker = blockers.length > 0;
  const blockerLabel = blockers[0]?.label;

  return (
    <Link key={quote.id} href={`/quotes/${quote.id}`} className="block">
      <Surface className="p-3 transition-colors hover:bg-[var(--tr-surface-2)] sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText size={17} weight="duotone" className="shrink-0 text-[var(--tr-primary)]" />
              <p className="truncate text-base font-black text-[var(--tr-text)]">{quote.client_name}</p>
            </div>
            {quote.client_address && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-[var(--tr-text-muted)]">
                <MapPin size={14} weight="duotone" className="mt-0.5 shrink-0 text-[var(--tr-text-faint)]" />
                <span className="line-clamp-1 sm:line-clamp-2">{quote.client_address}</span>
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-black tracking-tight text-[var(--tr-text)] tabular-nums">{formatCurrency(quote.total)}</p>
            <div className="mt-1"><Badge variant={statusVariant(quote.status)}>{quote.status}</Badge></div>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tr-text-faint)]">Next step</p>
              <p className="mt-1 text-sm font-bold leading-5 text-[var(--tr-text)]">{state.nextAction}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--tr-text-muted)]">{state.nextActionDetail}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${hasBlocker ? "bg-[var(--tr-amber)]/12 text-[var(--tr-amber)]" : deliveryClass(state.deliveryTone)}`}>
              {hasBlocker ? blockerLabel : state.deliveryLabel}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--tr-border-soft)] pt-3 text-xs text-[var(--tr-text-muted)]">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              {hasBlocker ? (
                <SealCheck size={14} weight="duotone" className="shrink-0 text-[var(--tr-amber)]" />
              ) : (
                <CheckCircle size={14} weight="duotone" className="shrink-0 text-[var(--tr-green)]" />
              )}
              <span className="truncate">
                {hasBlocker ? `${blockers.length} item${blockers.length === 1 ? "" : "s"} to finish` : "Ready for the next step"}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <CalendarBlank size={14} weight="duotone" className="text-[var(--tr-text-faint)]" />
              {quote.scheduled_start ? formatDate(quote.scheduled_start) : formatDate(quote.updated_at ?? quote.created_at)}
            </span>
          </div>
        </div>
      </Surface>
    </Link>
  );
}

function ReadinessRow({
  complete,
  label,
  detail,
}: {
  complete: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex gap-2 rounded-lg bg-white/[0.04] p-2.5">
      <span className={complete ? "text-[var(--tr-green)]" : "text-[var(--tr-amber)]"}>
        {complete ? <CheckCircle size={16} weight="duotone" /> : <SealCheck size={16} weight="duotone" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[var(--tr-text)]">{label}</span>
        <span className="block truncate text-xs text-[var(--tr-text-muted)]">{detail}</span>
      </span>
    </div>
  );
}

function deliveryClass(tone: "ready" | "sent" | "missing") {
  if (tone === "sent") return "bg-[var(--tr-badge-success-bg)] text-[var(--tr-badge-success-text)] ring-1 ring-[var(--tr-badge-success-ring)]";
  if (tone === "ready") return "bg-[var(--tr-badge-info-bg)] text-[var(--tr-badge-info-text)] ring-1 ring-[var(--tr-badge-info-ring)]";
  return "bg-[var(--tr-badge-warning-bg)] text-[var(--tr-badge-warning-text)] ring-1 ring-[var(--tr-badge-warning-ring)]";
}
