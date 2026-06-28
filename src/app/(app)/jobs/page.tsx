import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { CalendarBlank, CheckCircle, MapPin, Wrench } from "@/components/ui/icons";
import { formatDate, formatTime } from "@/lib/format";
import { ChartCard, ValueBarChart } from "@/components/charts/taskrel-charts";
import { buildTaskrelInsights } from "@/lib/insights";
import { getJobWorkflowState } from "@/lib/workflows/job-workflow";

const JOBS_QUEUE_LIMIT = 160;
const SUPPORTING_RECORD_LIMIT = 500;

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!contractor) redirect("/onboarding");

  const [jobsResult, quotesResult, invoicesResult, clientsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, description, status, scheduled_start, scheduled_end, address, quote_id, created_at, updated_at")
      .eq("contractor_id", contractor.id)
      .order("scheduled_start", { ascending: true })
      .limit(JOBS_QUEUE_LIMIT),
    supabase
      .from("quotes")
      .select("id, client_name, total, status, created_at, scheduled_start")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false })
      .limit(SUPPORTING_RECORD_LIMIT),
    supabase
      .from("invoices")
      .select("id, client_name, total, amount_paid, status, due_date, paid_at, created_at")
      .eq("contractor_id", contractor.id)
      .order("created_at", { ascending: false })
      .limit(SUPPORTING_RECORD_LIMIT),
    supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("contractor_id", contractor.id)
      .order("name", { ascending: true })
      .limit(SUPPORTING_RECORD_LIMIT),
  ]);

  const jobs = jobsResult.data ?? [];
  const insights = buildTaskrelInsights({
    jobs,
    quotes: quotesResult.data ?? [],
    invoices: invoicesResult.data ?? [],
    clients: clientsResult.data ?? [],
  });
  const jobStates = jobs.map(job => ({ job, state: getJobWorkflowState(job) }));
  const activeJobs = jobStates
    .filter(({ state }) => state.bucket !== "closed")
    .sort((a, b) => new Date(a.job.scheduled_start).getTime() - new Date(b.job.scheduled_start).getTime());
  const todayJobs = activeJobs.filter(({ state }) => state.bucket === "today");
  const nextJob = todayJobs[0] ?? activeJobs[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Jobs"
        subtitle="Today first, upcoming next."
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Surface className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--tr-text)]">Active work</h2>
            <Link href="/calendar" className="text-sm font-semibold text-[var(--tr-primary)]">Calendar view</Link>
          </div>
          {activeJobs.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {activeJobs.map(({ job, state }) => (
                <article key={job.id} className="rounded-lg bg-[var(--tr-bg-soft)] p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--tr-text)]">{job.title}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-[var(--tr-text-muted)]">
                        <CalendarBlank size={16} />
                        {state.nextActionDetail}
                      </p>
                      {job.address && (
                        <p className="mt-2 flex items-start gap-2 text-sm text-[var(--tr-text-faint)]">
                          <MapPin size={16} className="mt-0.5 shrink-0" />
                          <span>{job.address}</span>
                        </p>
                      )}
                      {job.quote_id && (
                        <Link href={`/quotes/${job.quote_id}`} className="mt-3 inline-flex text-sm font-semibold text-[var(--tr-primary)]">
                          Open quote
                        </Link>
                      )}
                    </div>
                    <Badge variant={statusVariant(state.effectiveStatus)}>{state.effectiveStatus.replace("_", " ")}</Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--tr-border)] p-8 text-center">
              <Wrench size={34} className="mx-auto text-[var(--tr-text-faint)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--tr-text)]">No active jobs yet</p>
              <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Approved quotes with scheduled dates will become jobs.</p>
            </div>
          )}
        </Surface>

        <Surface className="p-5">
          {nextJob ? (
            <div>
              <p className="text-sm font-semibold text-[var(--tr-green)]">{nextJob.state.bucket === "today" ? "Today" : "Next job"}</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--tr-text)]">{nextJob.job.title}</h2>
              <p className="mt-2 text-sm text-[var(--tr-text-muted)]">
                {formatDate(nextJob.job.scheduled_start)} at {formatTime(nextJob.job.scheduled_start)}
              </p>
              <div className="mt-5 space-y-3">
                {nextJob.state.proof.map(item => (
                  <div key={item.key} className="flex items-start gap-3 rounded-lg bg-[var(--tr-bg-soft)] p-3 text-sm text-[var(--tr-text)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
                    <CheckCircle size={18} className="text-[var(--tr-green)]" />
                    <div>
                      <p className="font-semibold">{item.label}</p>
                      <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-lg bg-[var(--tr-primary-fill)] p-3 text-sm font-semibold text-[var(--tr-primary)] shadow-[inset_0_0_0_1px_var(--tr-primary-edge)]">
                {nextJob.state.nextAction}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--tr-text-muted)]">No future scheduled job found.</p>
          )}
        </Surface>
      </section>

      {jobs.length > 0 && (
        <ChartCard title="Schedule load" subtitle="Scheduled and in-progress jobs over the next seven days">
          <ValueBarChart data={insights.charts.scheduleDensity} currency={false} />
        </ChartCard>
      )}
    </div>
  );
}
