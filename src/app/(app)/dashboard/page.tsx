import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LaunchReadinessChecklist } from "@/components/dashboard/launch-readiness-checklist";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt, Wrench } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getMissingEnv } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { buildTaskrelInsights } from "@/lib/insights";
import { buildLaunchReadiness } from "@/lib/launch-readiness";
import { createClient } from "@/lib/supabase/server";
import {
  buildAttentionList,
  buildDashboardCommandCenter,
  type AttentionItem,
  type DashboardCommandItem,
  type DashboardCommandLane,
} from "@/lib/workflows/dashboard-command-center";

const DASHBOARD_QUOTES_LIMIT = 500;
const DASHBOARD_JOBS_LIMIT = 240;
const DASHBOARD_INVOICES_LIMIT = 500;
const DASHBOARD_CLIENTS_LIMIT = 500;

const TONE_BADGE: Record<DashboardCommandItem["tone"], "error" | "warning" | "info" | "success"> = {
  danger: "error",
  warning: "warning",
  info: "info",
  success: "success",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, onboarding_complete, business_name, business_phone, business_website, license_text, logo_url, quote_default_terms, quote_policy_text, quote_template_preset, stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  if (!contractor?.onboarding_complete) redirect("/onboarding");

  const [quotesResult, jobsResult, invoicesResult, clientsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, client_name, client_address, client_email, client_phone, total, subtotal, tax_amount, status, line_items, notes, created_at, updated_at, scheduled_start, scheduled_end, sent_via, template_preset, follow_up_due_at, last_followed_up_at")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false })
      .limit(DASHBOARD_QUOTES_LIMIT),
    supabase
      .from("jobs")
      .select("id, title, quote_id, address, scheduled_start, scheduled_end, status, created_at, updated_at")
      .eq("contractor_id", contractor.id)
      .order("scheduled_start", { ascending: true })
      .limit(DASHBOARD_JOBS_LIMIT),
    supabase
      .from("invoices")
      .select("id, invoice_number, client_name, client_email, client_phone, total, amount_paid, status, due_date, paid_at, stripe_payment_link, sent_via, created_at, updated_at")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false })
      .limit(DASHBOARD_INVOICES_LIMIT),
    supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("contractor_id", contractor.id)
      .order("name", { ascending: true })
      .limit(DASHBOARD_CLIENTS_LIMIT),
  ]);

  const quotes = quotesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const clients = clientsResult.data ?? [];
  const insights = buildTaskrelInsights({ quotes, jobs, invoices, clients });
  const commandCenter = buildDashboardCommandCenter({ quotes, jobs, invoices });
  const attentionList = buildAttentionList(commandCenter, { limit: 6 });
  const activeWorkCount = commandCenter.today.items.length + commandCenter.quoteFollowUp.items.length + commandCenter.moneyToCollect.items.length;
  const hasBusinessData = quotes.length > 0 || jobs.length > 0 || invoices.length > 0;
  const launchReadiness = buildLaunchReadiness({
    contractor: {
      business_name: contractor.business_name,
      business_phone: contractor.business_phone,
      business_website: contractor.business_website,
      license_text: contractor.license_text,
      logo_url: contractor.logo_url,
      quote_default_terms: contractor.quote_default_terms,
      quote_policy_text: contractor.quote_policy_text,
      quote_template_preset: contractor.quote_template_preset,
      stripe_connect_account_id: contractor.stripe_connect_account_id,
    },
    delivery: {
      emailConfigured: getMissingEnv(["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"]).length === 0,
      smsConfigured: getMissingEnv(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]).length === 0,
    },
    quoteCount: quotes.length,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Today in Taskrel"
        subtitle={
          activeWorkCount === 0
            ? "You're all caught up."
            : `${activeWorkCount} ${activeWorkCount === 1 ? "item needs" : "items need"} attention.`
        }
      />

      {!launchReadiness.readyToSendFirstQuote && (
        <LaunchReadinessChecklist readiness={launchReadiness} />
      )}

      {/* Desktop: three tightened lanes. */}
      <section className="hidden gap-4 lg:grid lg:grid-cols-3" aria-label="What needs attention">
        <CommandLane lane={commandCenter.today} icon={<Wrench size={20} weight="duotone" />} href="/jobs" />
        <CommandLane lane={commandCenter.quoteFollowUp} icon={<FileText size={20} weight="duotone" />} href="/quotes" money />
        <CommandLane lane={commandCenter.moneyToCollect} icon={<Receipt size={20} weight="duotone" />} href="/invoices" money />
      </section>

      {/* Mobile / tablet: one ranked stream. */}
      <section className="lg:hidden" aria-label="What needs attention">
        <Surface elevation="raised" className="p-2">
          <h2 className="px-2 pb-1 pt-1.5 tr-h3 text-[var(--tr-text)]">Needs your attention</h2>
          {attentionList.length > 0 ? (
            <ul className="divide-y divide-[var(--tr-border-soft)]">
              {attentionList.map(item => (
                <li key={`${item.laneKey}-${item.id}`}>
                  <AttentionRow item={item} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-[var(--tr-text-muted)]">
              Nothing needs you right now. New jobs, quotes, and invoices show up here.
            </p>
          )}
          {activeWorkCount > attentionList.length && (
            <p className="px-2 pb-1 pt-2 text-xs text-[var(--tr-text-muted)]">
              Showing the {attentionList.length} most urgent. {activeWorkCount - attentionList.length} more in Jobs, Quotes, and Invoices.
            </p>
          )}
        </Surface>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <QuickLink href="/jobs">Jobs</QuickLink>
          <QuickLink href="/quotes">Quotes</QuickLink>
          <QuickLink href="/invoices">Invoices</QuickLink>
        </div>
      </section>

      {hasBusinessData && (
        <Surface className="px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Figure label="Active quote value" value={formatCurrency(insights.summaryMetrics.activeQuoteValue)} />
            <Figure label="Scheduled jobs" value={String(insights.summaryMetrics.scheduledJobsCount)} />
            <Figure label="Unpaid" value={formatCurrency(insights.summaryMetrics.unpaidInvoiceValue)} />
            <Figure label="Paid this month" value={formatCurrency(insights.summaryMetrics.paidThisMonth)} />
          </dl>
        </Surface>
      )}
    </div>
  );
}

function CommandLane({
  lane,
  icon,
  href,
  money,
}: {
  lane: DashboardCommandLane;
  icon: ReactNode;
  href: string;
  money?: boolean;
}) {
  return (
    <Surface elevation="raised" className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[var(--tr-primary)]">
          {icon}
          <h2 className="tr-h3 text-[var(--tr-text)]">{lane.title}</h2>
        </div>
        <p className="shrink-0 text-base font-semibold text-[var(--tr-text)] tabular-nums">
          {money ? formatCurrency(lane.total) : lane.total}
        </p>
      </div>

      {lane.items.length > 0 ? (
        <ul className="mt-3 flex-1 space-y-0.5">
          {lane.items.map(item => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--tr-surface-2)]"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-[var(--tr-text)]">{item.title}</span>
                  {typeof item.value === "number" && (
                    <span className="shrink-0 text-sm font-semibold text-[var(--tr-text)] tabular-nums">{formatCurrency(item.value)}</span>
                  )}
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <Badge variant={TONE_BADGE[item.tone]}>{item.statusLabel}</Badge>
                  {item.meta && <span className="min-w-0 flex-1 truncate text-xs text-[var(--tr-text-muted)]">{item.meta}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-lg bg-[var(--tr-bg-soft)] px-4 py-6 text-center shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
          <p className="text-sm font-medium text-[var(--tr-text)]">{lane.emptyTitle}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--tr-text-muted)]">{lane.emptyBody}</p>
        </div>
      )}

      <Link
        href={href}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-[var(--tr-border)] bg-[var(--tr-surface-2)] px-3 text-sm font-semibold text-[var(--tr-text)] transition-colors hover:bg-[var(--tr-surface-3)]"
      >
        View all
      </Link>
    </Surface>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <Link
      href={item.href}
      className="block rounded-lg p-3 transition-colors hover:bg-[var(--tr-surface-2)]"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold text-[var(--tr-text)]">{item.title}</span>
        {typeof item.value === "number" && (
          <span className="shrink-0 text-sm font-semibold text-[var(--tr-text)] tabular-nums">{formatCurrency(item.value)}</span>
        )}
      </span>
      <span className="mt-1 flex items-center gap-2 text-xs text-[var(--tr-text-muted)]">
        <Badge variant={TONE_BADGE[item.tone]}>{item.statusLabel}</Badge>
        <span className="font-medium text-[var(--tr-text)]">{item.laneLabel}</span>
      </span>
    </Link>
  );
}

function QuickLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--tr-border)] bg-[var(--tr-surface-2)] px-3 text-sm font-semibold text-[var(--tr-text)] transition-colors hover:bg-[var(--tr-surface-3)]"
    >
      {children}
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--tr-text-muted)]">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--tr-text)]">{value}</dd>
    </div>
  );
}
