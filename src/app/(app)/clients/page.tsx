import Link from "next/link";
import { redirect } from "next/navigation";
import { EnvelopeSimple, MapPin, Plus, Receipt, UserList } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, address, created_at")
    .eq("contractor_id", contractor?.id)
    .order("name", { ascending: true });

  const clientRows = clients ?? [];
  const [quotesResult, jobsResult, invoicesResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, client_id, client_name, client_email, client_phone, total, status, created_at")
      .eq("contractor_id", contractor?.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, client_id, title, status, scheduled_start, created_at")
      .eq("contractor_id", contractor?.id)
      .order("scheduled_start", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, client_id, client_name, client_email, client_phone, total, amount_paid, status, due_date, created_at")
      .eq("contractor_id", contractor?.id)
      .order("created_at", { ascending: false }),
  ]);
  const quotes = quotesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const completeContacts = clientRows.filter(client => client.email || client.phone).length;
  const withAddresses = clientRows.filter(client => client.address).length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Clients"
        subtitle="Reach clients, spot missing contact info, and pick up recent work."
        action={(
          <Link
            href="/quotes/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--tr-orange)] px-4 text-sm font-bold text-[#241205] hover:bg-[var(--tr-amber)]"
          >
            <Plus size={18} weight="bold" />
            New quote
          </Link>
        )}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <ClientMetric label="Clients" value={String(clientRows.length)} detail="Saved from quote activity" />
        <ClientMetric label="Reachable" value={String(completeContacts)} detail="Email or phone saved" />
        <ClientMetric label="With addresses" value={String(withAddresses)} detail="Ready for site context" />
      </div>

      {clientRows.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {clientRows.map(client => {
            const recentQuote = quotes.find(quote => quote.client_id === client.id || quote.client_email === client.email || quote.client_phone === client.phone);
            const recentJob = jobs.find(job => job.client_id === client.id);
            const recentInvoice = invoices.find(invoice => invoice.client_id === client.id || invoice.client_email === client.email || invoice.client_phone === client.phone);
            const missingContact = !client.email && !client.phone;
            const nextAction = missingContact
              ? "Add contact before sending"
              : recentInvoice && recentInvoice.status !== "paid"
                ? "Review invoice"
                : recentQuote && ["draft", "sent", "approved"].includes(recentQuote.status)
                  ? "Open quote"
                  : "Create quote";
            const nextHref = recentInvoice && recentInvoice.status !== "paid"
              ? `/invoices/${recentInvoice.id}`
              : recentQuote && ["draft", "sent", "approved"].includes(recentQuote.status)
                ? `/quotes/${recentQuote.id}`
                : "/quotes/new";

            return (
            <Surface key={client.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--tr-orange)]/15 text-[var(--tr-orange)]">
                  <UserList size={22} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{client.name}</p>
                  <p className="mt-1 text-xs text-[var(--tr-text-faint)]">Added {formatDate(client.created_at)}</p>
                </div>
                {missingContact ? <Badge variant="warning">Missing contact</Badge> : <Badge variant="success">Reachable</Badge>}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex min-w-0 items-center gap-2 text-[var(--tr-text-muted)] hover:text-white">
                    <EnvelopeSimple size={16} weight="duotone" className="shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </a>
                )}
                {client.phone && <a href={`tel:${client.phone}`} className="block text-[var(--tr-text-muted)] hover:text-white">{client.phone}</a>}
                {client.address && (
                  <p className="flex items-start gap-2 text-[var(--tr-text-faint)]">
                    <MapPin size={16} weight="duotone" className="mt-0.5 shrink-0" />
                    <span>{client.address}</span>
                  </p>
                )}
              </div>
              {(recentQuote || recentJob || recentInvoice) && (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs font-semibold text-[var(--tr-text-faint)]">Recent work</p>
                  {recentInvoice && (
                    <p className="mt-2 flex items-center justify-between gap-3 text-sm text-white">
                      <span className="flex min-w-0 items-center gap-2 truncate"><Receipt size={15} />Invoice</span>
                      <span className="font-semibold">{formatCurrency(Number(recentInvoice.total ?? 0) - Number(recentInvoice.amount_paid ?? 0))}</span>
                    </p>
                  )}
                  {recentQuote && <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Quote: {recentQuote.status}</p>}
                  {recentJob && <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Job: {recentJob.status.replace("_", " ")}</p>}
                </div>
              )}
              <Link href={nextHref} className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--tr-orange)] px-3 text-sm font-bold text-[#241205] hover:bg-[var(--tr-amber)]">
                {nextAction}
              </Link>
            </Surface>
          )})}
        </div>
      ) : (
        <Surface className="p-10 text-center">
          <UserList size={34} weight="duotone" className="mx-auto mb-3 text-slate-500" />
          <p className="font-semibold text-white">No clients yet</p>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Clients are added automatically when you send a quote.</p>
          <Link href="/quotes/new" className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--tr-orange)] px-4 text-sm font-bold text-[#241205]">
            <Plus size={17} weight="bold" />
            Create a quote
          </Link>
        </Surface>
      )}
    </div>
  );
}

function ClientMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Surface className="p-4">
      <p className="text-sm font-semibold text-[var(--tr-text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-[var(--tr-text-faint)]">{detail}</p>
    </Surface>
  );
}
