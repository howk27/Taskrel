import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { CalendarBlank, CheckCircle, MapPin, Wrench } from "@/components/ui/icons";
import { formatDate, formatTime } from "@/lib/format";
import { ChartCard, ValueBarChart } from "@/components/charts/taskrel-charts";
import { buildTaskrelInsights } from "@/lib/insights";
import { getCurrentWorkspace } from "@/lib/auth/workspace";

export default async function JobsPage() {
  const { supabase, contractor } = await getCurrentWorkspace();

  if (!contractor) redirect("/onboarding");

  const [jobsResult, quotesResult, invoicesResult, clientsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, description, status, scheduled_start, scheduled_end, address, created_at")
      .eq("contractor_id", contractor.id)
      .order("scheduled_start", { ascending: true }),
    supabase
      .from("quotes")
      .select("id, client_name, total, status, created_at, scheduled_start")
      .eq("contractor_id", contractor.id),
    supabase
      .from("invoices")
      .select("id, client_name, total, amount_paid, status, due_date, paid_at, created_at")
      .eq("contractor_id", contractor.id),
    supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("contractor_id", contractor.id),
  ]);

  const jobs = jobsResult.data ?? [];
  const insights = buildTaskrelInsights({
    jobs,
    quotes: quotesResult.data ?? [],
    invoices: invoicesResult.data ?? [],
    clients: clientsResult.data ?? [],
  });
  const activeJobs = jobs.filter(job => ["scheduled", "in_progress"].includes(job.status));
  const nextJob = activeJobs.filter(job => new Date(job.scheduled_start) >= new Date())[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        eyebrow="Operations"
        title="Jobs"
        subtitle="See what is scheduled, what is in progress, and where attention is needed before crews head out."
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Surface className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--tr-text)]">Active work</h2>
            <Link href="/calendar" className="text-sm font-semibold text-[var(--tr-primary)]">Calendar view</Link>
          </div>
          {activeJobs.length > 0 ? (
            <div className="divide-y divide-[var(--tr-border-soft)]">
              {activeJobs.map(job => (
                <article key={job.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-[var(--tr-text)]">{job.title}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-[var(--tr-text-muted)]">
                        <CalendarBlank size={16} />
                        {formatDate(job.scheduled_start)} at {formatTime(job.scheduled_start)}
                      </p>
                      {job.address && (
                        <p className="mt-2 flex items-start gap-2 text-sm text-[var(--tr-text-faint)]">
                          <MapPin size={16} className="mt-0.5 shrink-0" />
                          <span>{job.address}</span>
                        </p>
                      )}
                    </div>
                    <Badge variant={statusVariant(job.status)}>{job.status.replace("_", " ")}</Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--tr-border)] p-8 text-center">
              <Wrench size={34} className="mx-auto text-[var(--tr-text-faint)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--tr-text)]">No active jobs yet</p>
              <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Approved quotes with scheduled dates will become jobs.</p>
            </div>
          )}
        </Surface>

        <Surface className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tr-green)]">Next job</p>
          {nextJob ? (
            <div className="mt-3">
              <h2 className="text-2xl font-black text-[var(--tr-text)]">{nextJob.title}</h2>
              <p className="mt-2 text-sm text-[var(--tr-text-muted)]">
                {formatDate(nextJob.scheduled_start)} at {formatTime(nextJob.scheduled_start)}
              </p>
              <div className="mt-5 divide-y divide-[var(--tr-border-soft)]">
                {["Confirm client", "Review materials", "Capture completion notes"].map(item => (
                  <div key={item} className="flex items-center gap-3 py-3 text-sm text-[var(--tr-text)] first:pt-0 last:pb-0">
                    <CheckCircle size={18} className="shrink-0 text-[var(--tr-green)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--tr-text-muted)]">No future scheduled job found.</p>
          )}
        </Surface>
      </section>

      <ChartCard title="Schedule load" subtitle="Scheduled and in-progress jobs over the next seven days">
        <ValueBarChart data={insights.charts.scheduleDensity} currency={false} />
      </ChartCard>
    </div>
  );
}
