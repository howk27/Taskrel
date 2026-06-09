import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("business_name, trade, onboarding_complete")
    .eq("user_id", user.id)
    .single();

  if (!contractor?.onboarding_complete) redirect("/onboarding");

  const { data: recentQuotes } = await supabase
    .from("quotes")
    .select("id, client_name, total, status, created_at")
    .eq("contractor_id", (await supabase.from("contractors").select("id").eq("user_id", user.id).single()).data?.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: upcomingJobs } = await supabase
    .from("jobs")
    .select("id, title, scheduled_start, status")
    .eq("contractor_id", (await supabase.from("contractors").select("id").eq("user_id", user.id).single()).data?.id)
    .gte("scheduled_start", new Date().toISOString())
    .order("scheduled_start", { ascending: true })
    .limit(3);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">{contractor.business_name || "Dashboard"}</h1>
          <p className="text-sm text-slate-400 capitalize">{contractor.trade}</p>
        </div>
        <Link
          href="/quotes/new"
          className="flex items-center gap-2 bg-[#F97316] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#EA6C0A] active:scale-[0.98] transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Quote
        </Link>
      </div>

      {/* Recent quotes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Recent Quotes</h2>
          <Link href="/quotes" className="text-xs text-[#F97316]">See all</Link>
        </div>
        {recentQuotes && recentQuotes.length > 0 ? (
          <div className="rounded-xl bg-[#1E293B] divide-y divide-slate-700/50">
            {recentQuotes.map(q => (
              <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors">
                <div>
                  <p className="text-white text-sm font-medium">{q.client_name}</p>
                  <p className="text-slate-500 text-xs">{new Date(q.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
                  <p className="text-white font-semibold text-sm">${q.total.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#1E293B] p-6 text-center">
            <p className="text-slate-400 text-sm">No quotes yet.</p>
            <Link href="/quotes/new" className="text-[#F97316] text-sm font-medium mt-1 block">Create your first quote →</Link>
          </div>
        )}
      </section>

      {/* Upcoming jobs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Upcoming Jobs</h2>
          <Link href="/calendar" className="text-xs text-[#F97316]">Calendar</Link>
        </div>
        {upcomingJobs && upcomingJobs.length > 0 ? (
          <div className="rounded-xl bg-[#1E293B] divide-y divide-slate-700/50">
            {upcomingJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{job.title}</p>
                  <p className="text-slate-500 text-xs">{new Date(job.scheduled_start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                </div>
                <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#1E293B] p-6 text-center">
            <p className="text-slate-400 text-sm">No upcoming jobs scheduled.</p>
          </div>
        )}
      </section>
    </div>
  );
}
