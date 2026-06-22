import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { ChartCard, PipelineDonut, RevenueAreaChart, ValueBarChart } from "@/components/charts/taskrel-charts";
import { DashboardWorkQueue } from "@/components/dashboard/dashboard-work-queue";
import { CalendarBlank, FileText, Receipt } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";
import { buildTaskrelInsights } from "@/lib/insights";
import { emptyStateFor } from "@/lib/readiness/setup-readiness";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, onboarding_complete")
    .eq("user_id", user.id)
    .single();

  if (!contractor?.onboarding_complete) redirect("/onboarding");

  const [quotesResult, jobsResult, invoicesResult, clientsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, client_name, client_address, total, subtotal, tax_amount, status, line_items, notes, created_at, scheduled_start, scheduled_end, sent_via, template_preset")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, title, quote_id, address, scheduled_start, scheduled_end, status")
      .eq("contractor_id", contractor.id)
      .order("scheduled_start", { ascending: true }),
    supabase
      .from("invoices")
      .select("id, client_name, total, amount_paid, status, due_date, paid_at, created_at")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("contractor_id", contractor.id),
  ]);

  const quotes = quotesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const clients = clientsResult.data ?? [];
  const insights = buildTaskrelInsights({ quotes, jobs, invoices, clients });
  const activeQuotes = quotes.filter(quote => ["draft", "sent", "approved"].includes(quote.status));
  const upcomingJobs = jobs
    .filter(job => ["scheduled", "in_progress"].includes(job.status))
    .filter(job => new Date(job.scheduled_start) >= new Date())
    .slice(0, 4);
  const quotesEmpty = emptyStateFor("quotes");
  const jobsEmpty = emptyStateFor("jobs");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Dashboard"
        subtitle="Quotes, schedule, and payments that need attention."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={<FileText size={21} />} label="Active quotes" value={formatCurrency(insights.summaryMetrics.activeQuoteValue)} />
        <Metric icon={<CalendarBlank size={21} />} label="Scheduled jobs" value={String(insights.summaryMetrics.scheduledJobsCount)} />
        <Metric icon={<Receipt size={21} />} label="Unpaid invoices" value={formatCurrency(insights.summaryMetrics.unpaidInvoiceValue)} tone="amber" />
        <Metric icon={<Receipt size={21} />} label="Paid this month" value={formatCurrency(insights.summaryMetrics.paidThisMonth)} tone="green" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Surface className="p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Active quotes</h2>
              <p className="text-sm text-[var(--tr-text-muted)]">Expand a quote to see what was sent and what to do next.</p>
            </div>
            <Link href="/quotes" className="shrink-0 text-sm font-semibold text-[var(--tr-blue)]">View all</Link>
          </div>
          {activeQuotes.length > 0 ? (
            <DashboardWorkQueue quotes={activeQuotes} />
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--tr-border)] p-8 text-center">
              <FileText size={34} weight="duotone" className="mx-auto mb-3 text-[var(--tr-text-faint)]" />
              <p className="text-sm font-semibold text-white">{quotesEmpty.title}</p>
              <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{quotesEmpty.body}</p>
              {quotesEmpty.href && quotesEmpty.actionLabel ? (
                <Link
                  href={quotesEmpty.href}
                  className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f]"
                >
                  {quotesEmpty.actionLabel}
                </Link>
              ) : null}
            </div>
          )}
        </Surface>

        <div className="space-y-4">
          <Surface className="p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white">Scheduled work</h2>
              <Link href="/jobs" className="shrink-0 text-sm font-semibold text-[var(--tr-blue)]">View jobs</Link>
            </div>
            {upcomingJobs.length > 0 ? (
              <div className="space-y-3">
                {upcomingJobs.map(job => (
                  <div key={job.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{job.title}</p>
                        <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{formatDate(job.scheduled_start)}</p>
                        {job.quote_id && (
                          <Link href={`/quotes/${job.quote_id}`} className="mt-3 inline-flex text-sm font-semibold text-[var(--tr-blue)]">
                            Open quote
                          </Link>
                        )}
                      </div>
                      <Badge variant={statusVariant(job.status)}>{job.status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--tr-border)] p-8 text-center">
                <CalendarBlank size={34} weight="duotone" className="mx-auto mb-3 text-[var(--tr-text-faint)]" />
                <p className="text-sm font-semibold text-white">{jobsEmpty.title}</p>
                <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{jobsEmpty.body}</p>
                {jobsEmpty.href && jobsEmpty.actionLabel ? (
                  <Link
                    href={jobsEmpty.href}
                    className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f]"
                  >
                    {jobsEmpty.actionLabel}
                  </Link>
                ) : null}
              </div>
            )}
          </Surface>

          <Surface className="p-5">
            <h2 className="text-lg font-bold text-white">Needs attention</h2>
            <div className="mt-4 space-y-3">
              {insights.risks.length > 0 ? insights.risks.map(risk => (
                <Link key={risk.id} href={risk.href ?? "#"} className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06]">
                  <p className="text-sm font-bold text-white">{risk.title}</p>
                  <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{risk.body}</p>
                  {risk.actionLabel && <p className="mt-3 text-sm font-semibold text-[var(--tr-blue)]">{risk.actionLabel}</p>}
                </Link>
              )) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--tr-text-muted)]">
                  No urgent risks found. Taskrel will flag missing contact, unpaid invoices, stale quotes, and upcoming work here.
                </p>
              )}
            </div>
          </Surface>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Business snapshot</h2>
          <p className="text-sm text-[var(--tr-text-muted)]">Trends that help you understand the work queue.</p>
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
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber";
}) {
  const toneClass = tone === "green" ? "text-[var(--tr-green)]" : tone === "amber" ? "text-[var(--tr-amber)]" : "text-[var(--tr-blue)]";
  return (
    <Surface className="p-4">
      <div className={`mb-3 ${toneClass}`}>{icon}</div>
      <p className="text-xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tr-text-faint)]">{label}</p>
    </Surface>
  );
}
