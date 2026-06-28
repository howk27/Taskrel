"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { QuoteLineItem, QuoteStatus } from "@/types";
import { Badge, statusVariant } from "@/components/ui/badge";
import { PaginationRow, type PaginationInfo } from "@/components/ui/pagination-row";
import {
  CheckCircle,
  FileText,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plus,
  Receipt,
  SealCheck,
  WarningCircle,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";
import { emptyStateFor } from "@/lib/readiness/setup-readiness";
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
  follow_up_due_at?: string | null;
  last_followed_up_at?: string | null;
  sent_via: ("email" | "sms")[] | null;
  line_items: QuoteLineItem[] | null;
  notes: string | null;
};

type QuoteFilter = QuoteWorkflowBucket | "all";

const workflowFilters = workflowBucketOptions();

export function QuotesWorkflow({
  quotes,
  initialSearch = "",
  pagination,
  workflowNowIso,
}: {
  quotes: QuoteListItem[];
  initialSearch?: string;
  pagination?: PaginationInfo;
  workflowNowIso: string;
}) {
  const [filter, setFilter] = useState<QuoteFilter>("all");
  const [search, setSearch] = useState(initialSearch);
  const workflowNow = useMemo(() => new Date(workflowNowIso), [workflowNowIso]);

  const summaries = useMemo(() => getQuoteWorkflowSummary(quotes, { now: workflowNow }), [quotes, workflowNow]);
  const totalValue = useMemo(() => quotes.reduce((sum, quote) => sum + Number(quote.total ?? 0), 0), [quotes]);
  const filters = useMemo(() => [
    { key: "all" as const, shortLabel: "All", count: quotes.length, total: totalValue },
    ...workflowFilters.map((item) => {
      const summary = summaries.find((current) => current.key === item.key);
      return { ...item, count: summary?.count ?? 0, total: summary?.total ?? 0 };
    }),
  ], [quotes.length, summaries, totalValue]);
  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLowerCase();

    return quotes.filter(quote => {
      const state = getQuoteWorkflowState(quote, { now: workflowNow });
      if (filter !== "all" && state.bucket !== filter) return false;
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
  }, [filter, quotes, search, workflowNow]);

  const empty = filteredQuotes.length === 0 && search.trim() ? emptyStateFor("quote_results") : emptyStateFor("quotes");

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Quotes"
        subtitle="Review, send, and move approved work forward."
      />

      <Surface className="p-4 sm:p-5">
        <form action="/quotes" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="tr-input flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg px-3">
            <MagnifyingGlass size={18} className="text-[var(--tr-text-faint)]" />
            <input
              name="q"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Find a quote by client, address, contact, or status"
              className="min-w-0 flex-1 bg-transparent text-base text-[var(--tr-text)] placeholder:text-[var(--tr-text-faint)] focus:outline-none"
            />
          </label>
          <div className="flex shrink-0 gap-2">
            {search.trim() && (
              <Link href="/quotes" className="inline-flex h-12 items-center rounded-lg border border-[var(--tr-border)] px-4 text-sm font-semibold text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]">
                Clear
              </Link>
            )}
            <button type="submit" className="tr-primary-action inline-flex h-12 items-center rounded-lg px-5 text-sm font-semibold">
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {filters.map(item => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-lg px-3 py-3 text-left transition-colors shadow-[inset_0_0_0_1px_var(--tr-border-soft)] ${
                  active
                    ? "bg-[var(--tr-primary-fill)] text-[var(--tr-text)]"
                    : "bg-[var(--tr-bg-soft)] text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{item.shortLabel}</span>
                  <span className="text-sm font-semibold tabular-nums">{item.count}</span>
                </span>
                <span className="mt-1 block truncate text-sm text-[var(--tr-text-muted)]" title={`${formatCurrency(item.total)} total`}>
                  {formatCurrency(item.total)}
                </span>
              </button>
            );
          })}
        </div>
      </Surface>

      {quotes.length === 0 && !search.trim() && (
        <Surface className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="p-6 sm:p-8">
              <Receipt size={34} weight="duotone" className="text-[var(--tr-orange)]" />
              <h2 className="mt-4 text-2xl font-semibold text-[var(--tr-text)]">Create the first quote</h2>
              <p className="mt-2 max-w-xl text-base leading-7 text-[var(--tr-text-muted)]">
                Start with the client and job notes. Taskrel drafts line items, lets you edit the total, and keeps the quote ready to send or save.
              </p>
              <Link href="/quotes/new" className="tr-primary-action mt-6 inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold">
                <Plus size={18} weight="bold" />
                Create new
              </Link>
            </div>
            <div className="border-t border-[var(--tr-border-soft)] bg-[var(--tr-bg-soft)] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <p className="text-sm font-semibold text-[var(--tr-text)]">What happens next</p>
              <div className="mt-4 space-y-4">
                <QuoteDeskPoint title="Draft from notes" body="Describe the job in plain English and review the generated lines." />
                <QuoteDeskPoint title="Send or save" body="Email, SMS, or keep it as a draft until the client is ready." />
                <QuoteDeskPoint title="Convert approved work" body="Approved quotes can become jobs and invoices without retyping." />
              </div>
            </div>
          </div>
        </Surface>
      )}

      {filteredQuotes.length > 0 ? (
        <Surface className="overflow-hidden">
          <div className="hidden gap-x-4 border-b border-[var(--tr-border-soft)] px-4 py-2.5 text-[13px] font-medium text-[var(--tr-text-faint)] sm:grid sm:grid-cols-[auto_minmax(0,1.7fr)_minmax(0,1fr)_7rem_6.5rem]">
            <span className="w-[18px]" aria-hidden="true" />
            <span>Client</span>
            <span>Next action</span>
            <span className="justify-self-end">Total</span>
            <span className="justify-self-end">Date</span>
          </div>
          {filteredQuotes.map(quote => (
            <QuoteRow key={quote.id} quote={quote} workflowNow={workflowNow} />
          ))}
        </Surface>
      ) : quotes.length > 0 || search.trim() ? (
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
      ) : null}

      {pagination && <PaginationRow {...pagination} />}
    </div>
  );
}

function QuoteDeskPoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <CheckCircle size={18} weight="duotone" className="mt-0.5 shrink-0 text-[var(--tr-orange)]" />
      <div>
        <p className="text-sm font-semibold text-[var(--tr-text)]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">{body}</p>
      </div>
    </div>
  );
}

const bucketIconMeta: Record<QuoteWorkflowBucket, { Icon: typeof FileText; toneClass: string }> = {
  needs_review: { Icon: FileText, toneClass: "text-[var(--tr-amber)]" },
  waiting: { Icon: PaperPlaneTilt, toneClass: "text-[var(--tr-primary)]" },
  approved: { Icon: CheckCircle, toneClass: "text-[var(--tr-green)]" },
  closed: { Icon: SealCheck, toneClass: "text-[var(--tr-text-faint)]" },
};

function QuoteRow({ quote, workflowNow }: { quote: QuoteListItem; workflowNow: Date }) {
  const state = getQuoteWorkflowState(quote, { now: workflowNow });
  const blockers = state.readiness.filter(item => !item.complete);
  const hasBlocker = blockers.length > 0;
  const extraBlockers = blockers.length - 1;
  const { Icon, toneClass } = bucketIconMeta[state.bucket];
  const dateLabel = quote.scheduled_start
    ? formatDate(quote.scheduled_start)
    : formatDate(quote.updated_at ?? quote.created_at);

  return (
    <Link
      href={`/quotes/${quote.id}`}
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-[var(--tr-border-soft)] px-3.5 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-[var(--tr-surface-2)] focus-visible:bg-[var(--tr-surface-2)] sm:grid-cols-[auto_minmax(0,1.7fr)_minmax(0,1fr)_7rem_6.5rem] sm:gap-x-4 sm:px-4 sm:py-3"
      aria-label={`${quote.client_name} — ${quote.status}, ${formatCurrency(quote.total)}`}
    >
      <Icon
        size={18}
        weight="duotone"
        className={`col-start-1 row-start-1 row-span-2 shrink-0 self-center sm:row-span-1 ${toneClass}`}
      />

      <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-2">
        <p className="truncate font-semibold text-[var(--tr-text)]">{quote.client_name}</p>
        <span className="shrink-0">
          <Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
        </span>
      </div>

      <div className="col-start-2 row-start-2 flex min-w-0 items-center gap-1.5 sm:col-start-3 sm:row-start-1">
        {hasBlocker && (
          <WarningCircle size={15} weight="fill" className="shrink-0 text-[var(--tr-amber)]" />
        )}
        <span className={`truncate text-sm ${hasBlocker ? "text-[var(--tr-amber)]" : "text-[var(--tr-text-muted)]"}`}>
          {hasBlocker ? `${blockers[0]?.label}${extraBlockers > 0 ? ` +${extraBlockers}` : ""}` : state.nextAction}
        </span>
      </div>

      <p className="col-start-3 row-start-1 justify-self-end text-right font-semibold tabular-nums text-[var(--tr-text)] sm:col-start-4">
        {formatCurrency(quote.total)}
      </p>

      <p className="col-start-3 row-start-2 justify-self-end text-right text-sm tabular-nums text-[var(--tr-text-muted)] sm:col-start-5 sm:row-start-1">
        {dateLabel}
      </p>
    </Link>
  );
}
