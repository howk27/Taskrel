import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ChartCard, PipelineDonut, RevenueAreaChart, ValueBarChart } from "@/components/charts/taskrel-charts";
import { LaunchReadinessChecklist } from "@/components/dashboard/launch-readiness-checklist";
import { CalendarBlank, FileText, Receipt, Wrench } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getMissingEnv } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { buildTaskrelInsights } from "@/lib/insights";
import { buildLaunchReadiness } from "@/lib/launch-readiness";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardCommandCenter, type DashboardCommandLane } from "@/lib/workflows/dashboard-command-center";

const DASHBOARD_QUOTES_LIMIT = 500;
const DASHBOARD_JOBS_LIMIT = 240;
const DASHBOARD_INVOICES_LIMIT = 500;
const DASHBOARD_CLIENTS_LIMIT = 500;

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
        subtitle={`${activeWorkCount} ${activeWorkCount === 1 ? "item needs" : "items need"} attention.`}
      />

      {!launchReadiness.readyToSendFirstQuote && (
        <LaunchReadinessChecklist readiness={launchReadiness} />
      )}

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Dashboard command center">
        <CommandLane lane={commandCenter.today} icon={<Wrench size={22} weight="duotone" />} href="/jobs" />
        <CommandLane lane={commandCenter.quoteFollowUp} icon={<FileText size={22} weight="duotone" />} href="/quotes" money />
        <CommandLane lane={commandCenter.moneyToCollect} icon={<Receipt size={22} weight="duotone" />} href="/invoices" money />
      </section>

      {hasBusinessData && (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric icon={<FileText size={21} />} label="Active quote value" value={formatCurrency(insights.summaryMetrics.activeQuoteValue)} />
            <Metric icon={<CalendarBlank size={21} />} label="Scheduled jobs" value={String(insights.summaryMetrics.scheduledJobsCount)} />
            <Metric icon={<Receipt size={21} />} label="Unpaid invoices" value={formatCurrency(insights.summaryMetrics.unpaidInvoiceValue)} tone="amber" />
            <Metric icon={<Receipt size={21} />} label="Paid this month" value={formatCurrency(insights.summaryMetrics.paidThisMonth)} tone="green" />
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="tr-h2 text-[var(--tr-text)]">Business snapshot</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <ChartCard title="Revenue trend" subtitle="Paid invoices over the last six months">
                <RevenueAreaChart data={insights.charts.revenueTrend} />
              </ChartCard>
              <ChartCard title="Quote pipeline" subtitle="Value by current quote status">
                <PipelineDonut data={insights.charts.quotePipeline} />
              </ChartCard>
              <ChartCard title="Invoice aging" subtitle="Unpaid balance by due date">
                <ValueBarChart data={insights.charts.invoiceAging} />
              </ChartCard>
            </div>
          </section>
        </>
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[var(--tr-primary)]">
            {icon}
            <h2 className="tr-h3 text-[var(--tr-text)]">{lane.title}</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--tr-text-muted)]">{lane.subtitle}</p>
        </div>
        <p className="shrink-0 text-right text-lg font-semibold text-[var(--tr-text)] tabular-nums">
          {money ? formatCurrency(lane.total) : lane.total}
        </p>
      </div>

      {lane.items.length > 0 ? (
        <div className="mt-4 flex-1 divide-y divide-[var(--tr-border-soft)] overflow-hidden rounded-lg bg-[var(--tr-bg-soft)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
          {lane.items.map(item => (
            <Link key={item.id} href={item.href} className="block p-3 transition-colors hover:bg-[var(--tr-surface-2)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--tr-text)]">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--tr-text-muted)]">{item.body}</p>
                </div>
                {typeof item.value === "number" && (
                  <p className="shrink-0 text-sm font-semibold text-[var(--tr-text)]">{formatCurrency(item.value)}</p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="truncate text-sm text-[var(--tr-text-muted)]">{item.meta}</span>
                <span className="shrink-0 text-sm font-semibold text-[var(--tr-primary)]">{item.actionLabel}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
          <div className="mt-4 rounded-lg bg-[var(--tr-bg-soft)] p-4 text-center shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
            <div>
              <p className="text-sm font-semibold text-[var(--tr-text)]">{lane.emptyTitle}</p>
              <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{lane.emptyBody}</p>
            </div>
          </div>
      )}

      <Link href={href} className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-[var(--tr-border)] bg-[var(--tr-surface-2)] px-3 text-sm font-semibold text-[var(--tr-text)] transition-colors hover:bg-[var(--tr-surface-3)]">
        View all
      </Link>
    </Surface>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "orange",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "orange" | "green" | "amber";
}) {
  const toneClass = tone === "green" ? "text-[var(--tr-green)]" : tone === "amber" ? "text-[var(--tr-amber)]" : "text-[var(--tr-primary)]";
  return (
    <Surface className="p-4">
      <div className={`mb-3 ${toneClass}`}>{icon}</div>
      <p className="text-xl font-semibold tracking-tight text-[var(--tr-text)]">{value}</p>
      <p className="mt-1 text-sm font-medium text-[var(--tr-text-muted)]">{label}</p>
    </Surface>
  );
}
