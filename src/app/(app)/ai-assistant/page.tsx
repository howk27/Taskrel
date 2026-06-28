import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { Lightning } from "@/components/ui/icons";
import { buildTaskrelInsights } from "@/lib/insights";
import { buildDashboardCommandCenter, type DashboardCommandItem } from "@/lib/workflows/dashboard-command-center";
import { formatCurrency } from "@/lib/format";

const ASSISTANT_CONTEXT_LIMIT = 500;

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
    supabase.from("quotes").select("id, client_name, client_address, client_email, client_phone, total, status, created_at, updated_at, scheduled_start, sent_via, line_items, notes").eq("contractor_id", contractor.id).order("created_at", { ascending: false }).limit(ASSISTANT_CONTEXT_LIMIT),
    supabase.from("invoices").select("id, invoice_number, client_name, client_email, client_phone, total, amount_paid, status, due_date, paid_at, stripe_payment_link, sent_via, created_at, updated_at").eq("contractor_id", contractor.id).order("created_at", { ascending: false }).limit(ASSISTANT_CONTEXT_LIMIT),
    supabase.from("jobs").select("id, title, status, scheduled_start, scheduled_end, address, quote_id, created_at, updated_at").eq("contractor_id", contractor.id).order("scheduled_start", { ascending: true }).limit(ASSISTANT_CONTEXT_LIMIT),
    supabase.from("clients").select("id, name, email, phone").eq("contractor_id", contractor.id).order("name", { ascending: true }).limit(ASSISTANT_CONTEXT_LIMIT),
  ]);

  const commandCenter = buildDashboardCommandCenter({
    quotes: quotes.data ?? [],
    invoices: invoices.data ?? [],
    jobs: jobs.data ?? [],
  });
  const insights = buildTaskrelInsights({
    quotes: quotes.data ?? [],
    invoices: invoices.data ?? [],
    jobs: jobs.data ?? [],
    clients: clients.data ?? [],
  });
  const unresolved = [
    ...commandCenter.today.items,
    ...commandCenter.quoteFollowUp.items,
    ...commandCenter.moneyToCollect.items,
  ].slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Taskrel notices"
        subtitle="Work items Taskrel thinks need attention."
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Surface className="p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--tr-primary-fill)] text-[var(--tr-primary)]">
              <Lightning size={24} weight="duotone" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[var(--tr-text)]">Open recommendations</h2>
            </div>
          </div>
          {unresolved.length > 0 ? (
            <div className="divide-y divide-[var(--tr-border-soft)] overflow-hidden rounded-lg bg-[var(--tr-bg-soft)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
              {unresolved.map(item => <NoticeRow key={`${item.href}-${item.id}`} item={item} />)}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--tr-border)] p-8 text-center">
              <p className="font-semibold text-[var(--tr-text)]">No unresolved recommendations</p>
              <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Taskrel will show follow-ups, collection work, and schedule items here when they appear.</p>
            </div>
          )}
        </Surface>

        <Surface className="p-5">
          <h2 className="text-lg font-semibold text-[var(--tr-text)]">Watch list</h2>
          <p className="mt-1 text-base text-[var(--tr-text-muted)]">Risks that block quote-to-payment flow.</p>
          <div className="mt-4 space-y-3">
            {insights.risks.length > 0 ? insights.risks.map(risk => (
              <Link key={risk.id} href={risk.href ?? "#"} className="block rounded-lg bg-[var(--tr-bg-soft)] p-4 transition-colors shadow-[inset_0_0_0_1px_var(--tr-border-soft)] hover:bg-[var(--tr-surface-2)]">
                <p className="text-sm font-semibold text-[var(--tr-text)]">{risk.title}</p>
                <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{risk.body}</p>
                {risk.actionLabel && <p className="mt-3 text-sm font-semibold text-[var(--tr-primary)]">{risk.actionLabel}</p>}
              </Link>
            )) : (
              <p className="rounded-lg bg-[var(--tr-bg-soft)] p-4 text-sm text-[var(--tr-text-muted)] shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">No urgent risks found right now.</p>
            )}
          </div>
        </Surface>
      </section>
    </div>
  );
}

function NoticeRow({ item }: { item: DashboardCommandItem }) {
  return (
    <Link href={item.href} className="block p-4 transition-colors hover:bg-[var(--tr-surface-2)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--tr-text)]">{item.title}</p>
          <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{item.body}</p>
          <p className="mt-3 text-sm font-semibold text-[var(--tr-primary)]">{item.actionLabel}</p>
        </div>
        {typeof item.value === "number" && (
          <p className="shrink-0 text-sm font-semibold text-[var(--tr-text)]">{formatCurrency(item.value)}</p>
        )}
      </div>
    </Link>
  );
}
