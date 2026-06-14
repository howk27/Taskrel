import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { CalendarBlank, FileText, Plus, Receipt } from "@/components/ui/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import { TRADE_LABELS, type Trade } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, business_name, trade, primary_trade, onboarding_complete")
    .eq("user_id", user.id)
    .single();

  if (!contractor?.onboarding_complete) redirect("/onboarding");

  const [activeQuotesResult, upcomingJobsResult, unpaidInvoicesResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, client_name, total, status, created_at, scheduled_start")
      .eq("contractor_id", contractor.id)
      .in("status", ["draft", "sent"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("jobs")
      .select("id, title, scheduled_start, scheduled_end, status")
      .eq("contractor_id", contractor.id)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_start", new Date().toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(3),
    supabase
      .from("invoices")
      .select("id", { count: "exact" })
      .eq("contractor_id", contractor.id)
      .in("status", ["draft", "sent", "overdue"]),
  ]);

  const activeQuotes = activeQuotesResult.data ?? [];
  const upcomingJobs = upcomingJobsResult.data ?? [];
  const unpaidInvoiceCount = unpaidInvoicesResult.count ?? 0;
  const trade = (contractor.primary_trade ?? contractor.trade) as Trade | null;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <PageHeader
        title={contractor.business_name || "Dashboard"}
        subtitle={trade ? TRADE_LABELS[trade] : "Contractor workspace"}
        action={
          <Link
            href="/quotes/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F97316] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#EA6C0A] active:scale-[0.98]"
          >
            <Plus size={18} weight="bold" />
            New
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-2">
        <Surface className="p-3">
          <FileText size={18} className="text-[#F97316]" />
          <p className="mt-2 text-lg font-semibold text-white">{activeQuotes.length}</p>
          <p className="text-xs text-slate-400">Active quotes</p>
        </Surface>
        <Surface className="p-3">
          <CalendarBlank size={18} className="text-[#F97316]" />
          <p className="mt-2 text-lg font-semibold text-white">{upcomingJobs.length}</p>
          <p className="text-xs text-slate-400">Scheduled</p>
        </Surface>
        <Surface className="p-3">
          <Receipt size={18} className="text-[#F97316]" />
          <p className="mt-2 text-lg font-semibold text-white">{unpaidInvoiceCount}</p>
          <p className="text-xs text-slate-400">Unpaid</p>
        </Surface>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Active Quotes</h2>
          <Link href="/quotes" className="text-xs font-medium text-[#F97316]">See all</Link>
        </div>
        {activeQuotes.length > 0 ? (
          <div className="space-y-2">
            {activeQuotes.map((quote) => (
              <Link key={quote.id} href={`/quotes/${quote.id}`}>
                <Surface className="p-4 transition-colors hover:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{quote.client_name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Created {formatDate(quote.created_at)}
                        {quote.scheduled_start ? ` · Scheduled ${formatDate(quote.scheduled_start)}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatCurrency(quote.total)}</p>
                      <Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
                    </div>
                  </div>
                </Surface>
              </Link>
            ))}
          </div>
        ) : (
          <Surface className="p-6 text-center">
            <FileText size={28} className="mx-auto text-slate-500" />
            <p className="mt-3 text-sm font-medium text-white">No active quotes</p>
            <p className="mt-1 text-sm text-slate-400">Draft and sent quotes will show up here.</p>
          </Surface>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Upcoming Jobs</h2>
          <Link href="/calendar" className="text-xs font-medium text-[#F97316]">Calendar</Link>
        </div>
        {upcomingJobs.length > 0 ? (
          <div className="space-y-2">
            {upcomingJobs.map((job) => (
              <Surface key={job.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{job.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(job.scheduled_start)}</p>
                  </div>
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                </div>
              </Surface>
            ))}
          </div>
        ) : (
          <Surface className="p-6 text-center">
            <CalendarBlank size={28} className="mx-auto text-slate-500" />
            <p className="mt-3 text-sm font-medium text-white">No scheduled jobs</p>
            <p className="mt-1 text-sm text-slate-400">Approved quotes with a job date will appear here.</p>
          </Surface>
        )}
      </section>
    </div>
  );
}
