import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { PaginationRow } from "@/components/ui/pagination-row";
import { CalendarBlank, FileText, Plus, Receipt } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInvoiceWorkflowState } from "@/lib/workflows/invoice-workflow";
import { createClient } from "@/lib/supabase/server";

type InvoicesSearchParams = {
  page?: string;
};

const INVOICES_PAGE_SIZE = 50;

export default async function InvoicesPage({ searchParams }: { searchParams?: Promise<InvoicesSearchParams> }) {
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
  const from = (page - 1) * INVOICES_PAGE_SIZE;
  const to = from + INVOICES_PAGE_SIZE - 1;

  const { data: invoices, count } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_name, client_email, client_phone, total, amount_paid, status, due_date, paid_at, stripe_payment_link, sent_via, created_at, updated_at", { count: "exact" })
    .eq("contractor_id", contractor?.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const invoiceRows = invoices ?? [];
  const invoiceStates = invoiceRows.map(invoice => ({ invoice, state: getInvoiceWorkflowState(invoice) }));
  const activeInvoices = invoiceStates
    .filter(({ state }) => state.bucket !== "closed")
    .sort((a, b) => statePriority(b.state.effectiveStatus) - statePriority(a.state.effectiveStatus));

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Invoices"
        subtitle="Send, collect, and confirm payment."
        action={(
          <Link href="/quotes" className="tr-primary-action hidden h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold md:inline-flex">
            <Plus size={18} weight="bold" />
            Review quotes
          </Link>
        )}
      />

      {activeInvoices.length > 0 ? (
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--tr-border-soft)] px-4 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--tr-text)]">Invoice work queue</h2>
            </div>
            <Link href="/quotes" className="shrink-0 text-sm font-semibold text-[var(--tr-primary)]">Create from quote</Link>
          </div>
          <div className="divide-y divide-[var(--tr-border-soft)]">
            {activeInvoices.map(({ invoice, state }) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block px-4 py-4 transition-colors hover:bg-[var(--tr-surface-2)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={18} weight="duotone" className="shrink-0 text-[var(--tr-green)]" />
                      <p className="truncate text-sm font-semibold text-[var(--tr-text)]">{invoice.client_name}</p>
                      <Badge variant={statusVariant(state.effectiveStatus)}>{state.effectiveStatus}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{invoice.invoice_number}</p>
                    <p className="mt-2 text-sm leading-5 text-[var(--tr-text-muted)]">{state.nextActionDetail}</p>
                    {invoice.due_date && (
                      <p className="mt-3 flex items-center gap-1.5 text-sm text-[var(--tr-text-muted)]">
                        <CalendarBlank size={14} weight="duotone" />
                        Due {formatDate(invoice.due_date)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-[var(--tr-text)]">{formatCurrency(state.balanceDue)}</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--tr-primary)]">{state.nextAction}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Surface>
      ) : (
        <Surface className="p-10 text-center">
          <Receipt size={34} weight="duotone" className="mx-auto mb-3 text-slate-500" />
          <p className="font-semibold text-[var(--tr-text)]">{invoiceRows.length > 0 ? "No invoice work right now" : "No invoices yet"}</p>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Approved quotes can become invoices when work is ready to bill.</p>
          <Link href="/quotes" className="tr-primary-action mt-5 inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold">
            View quotes
          </Link>
        </Surface>
      )}

      <PaginationRow page={page} pageSize={INVOICES_PAGE_SIZE} total={count ?? 0} basePath="/invoices" />
    </div>
  );
}

function statePriority(status: string) {
  if (status === "overdue") return 4;
  if (status === "sent") return 3;
  if (status === "draft") return 2;
  return 1;
}

function parsePage(value?: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}
