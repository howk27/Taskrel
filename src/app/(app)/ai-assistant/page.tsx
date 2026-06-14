import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { ChartCard, PipelineDonut, ValueBarChart } from "@/components/charts/taskrel-charts";
import { Lightning, Plus } from "@/components/ui/icons";
import { buildTaskrelInsights } from "@/lib/insights";

export default async function AiAssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!contractor) redirect("/onboarding");

  const [quotes, invoices, jobs, clients] = await Promise.all([
    supabase.from("quotes").select("id, client_name, total, status, created_at, scheduled_start").eq("contractor_id", contractor.id),
    supabase.from("invoices").select("id, client_name, total, amount_paid, status, due_date, paid_at, created_at").eq("contractor_id", contractor.id),
    supabase.from("jobs").select("id, title, status, scheduled_start").eq("contractor_id", contractor.id),
    supabase.from("clients").select("id, name, email, phone").eq("contractor_id", contractor.id),
  ]);

  const insights = buildTaskrelInsights({
    quotes: quotes.data ?? [],
    invoices: invoices.data ?? [],
    jobs: jobs.data ?? [],
    clients: clients.data ?? [],
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        eyebrow="AI Assistant"
        title="What Taskrel noticed"
        subtitle="Real recommendations from your quotes, invoices, jobs, and clients. No fake market data."
        action={
          <Link href="/quotes/new" className="hidden h-11 items-center gap-2 rounded-xl bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f] md:inline-flex">
            <Plus size={18} weight="bold" />
            Generate quote
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Surface className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--tr-violet)]/15 text-[var(--tr-violet)]">
              <Lightning size={26} weight="duotone" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">Recommended next actions</h2>
              <p className="text-sm text-[var(--tr-text-muted)]">Prioritized from your active work.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {insights.nextActions.map(action => (
              <Link key={action.id} href={action.href ?? "#"} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]">
                <p className="text-base font-bold text-white">{action.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--tr-text-muted)]">{action.body}</p>
                <p className="mt-4 text-sm font-bold text-[var(--tr-blue)]">{action.actionLabel ?? "Open"}</p>
              </Link>
            ))}
          </div>
        </Surface>

        <Surface className="p-5">
          <h2 className="text-xl font-bold text-white">Watch list</h2>
          <div className="mt-4 space-y-3">
            {insights.risks.length > 0 ? insights.risks.map(risk => (
              <Link key={risk.id} href={risk.href ?? "#"} className="block rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-bold text-white">{risk.title}</p>
                <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{risk.body}</p>
              </Link>
            )) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--tr-text-muted)]">No urgent risks found right now.</p>
            )}
          </div>
        </Surface>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Pipeline intelligence" subtitle="Where quote value is sitting">
          <PipelineDonut data={insights.charts.quotePipeline} />
        </ChartCard>
        <ChartCard title="Schedule opportunities" subtitle="How loaded the next week looks">
          <ValueBarChart data={insights.charts.scheduleDensity} currency={false} />
        </ChartCard>
      </section>
    </div>
  );
}
