import Link from "next/link";
import { redirect } from "next/navigation";
import { EnvelopeSimple, MapPin, Plus, Receipt, UserList } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { PaginationRow } from "@/components/ui/pagination-row";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type ClientsSearchParams = {
  page?: string;
};

const CLIENTS_PAGE_SIZE = 60;
const RECENT_ACTIVITY_LIMIT = 600;

export default async function ClientsPage({ searchParams }: { searchParams?: Promise<ClientsSearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const page = parsePage(params?.page);
  const from = (page - 1) * CLIENTS_PAGE_SIZE;
  const to = from + CLIENTS_PAGE_SIZE - 1;

  const { data: clients, count } = await supabase
    .from("clients")
    .select("id, name, email, phone, address, created_at", { count: "exact" })
    .eq("contractor_id", contractor?.id)
    .order("name", { ascending: true })
    .range(from, to);

  const clientRows = clients ?? [];
  const [quotesResult, jobsResult, invoicesResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, client_id, client_name, client_email, client_phone, total, status, created_at")
      .eq("contractor_id", contractor?.id)
      .order("created_at", { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
    supabase
      .from("jobs")
      .select("id, client_id, title, status, scheduled_start, created_at")
      .eq("contractor_id", contractor?.id)
      .order("scheduled_start", { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
    supabase
      .from("invoices")
      .select("id, client_id, client_name, client_email, client_phone, total, amount_paid, status, due_date, created_at")
      .eq("contractor_id", contractor?.id)
      .order("created_at", { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
  ]);
  const quotes = quotesResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Clients"
        subtitle="Contact info and recent work in one place."
      />

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
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--tr-primary-fill)] text-[var(--tr-primary)]">
                  <UserList size={22} weight="duotone" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--tr-text)]">{client.name}</p>
                  <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Added {formatDate(client.created_at)}</p>
                </div>
                {missingContact ? <Badge variant="warning">Missing contact</Badge> : <Badge variant="success">Reachable</Badge>}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex min-w-0 items-center gap-2 text-[var(--tr-text-muted)] hover:text-[var(--tr-text)]">
                    <EnvelopeSimple size={16} weight="duotone" className="shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </a>
                )}
                {client.phone && <a href={`tel:${client.phone}`} className="block text-[var(--tr-text-muted)] hover:text-[var(--tr-text)]">{client.phone}</a>}
                {client.address && (
                  <p className="flex items-start gap-2 text-[var(--tr-text-faint)]">
                    <MapPin size={16} weight="duotone" className="mt-0.5 shrink-0" />
                    <span>{client.address}</span>
                  </p>
                )}
              </div>
              {(recentQuote || recentJob || recentInvoice) && (
                <div className="mt-4 rounded-lg bg-[var(--tr-bg-soft)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
                  <p className="text-sm font-semibold text-[var(--tr-text)]">Recent work</p>
                  {recentInvoice && (
                    <p className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--tr-text)]">
                      <span className="flex min-w-0 items-center gap-2 truncate"><Receipt size={15} />Invoice</span>
                      <span className="font-semibold">{formatCurrency(Number(recentInvoice.total ?? 0) - Number(recentInvoice.amount_paid ?? 0))}</span>
                    </p>
                  )}
                  {recentQuote && <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Quote: {recentQuote.status}</p>}
                  {recentJob && <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Job: {recentJob.status.replace("_", " ")}</p>}
                </div>
              )}
              <Link href={nextHref} className="tr-primary-action mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg px-3 text-sm font-semibold">
                {nextAction}
              </Link>
            </Surface>
          )})}
        </div>
      ) : (
        <Surface className="p-10 text-center">
          <UserList size={34} weight="duotone" className="mx-auto mb-3 text-slate-500" />
          <p className="font-semibold text-[var(--tr-text)]">No clients yet</p>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Clients are added automatically when you send a quote.</p>
          <Link href="/quotes/new" className="tr-primary-action mt-5 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold">
            <Plus size={17} weight="bold" />
            Create a quote
          </Link>
        </Surface>
      )}

      <PaginationRow page={page} pageSize={CLIENTS_PAGE_SIZE} total={count ?? 0} basePath="/clients" />
    </div>
  );
}

function parsePage(value?: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}
