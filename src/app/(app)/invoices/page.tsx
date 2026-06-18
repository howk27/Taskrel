import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { ChartCard, ValueBarChart } from "@/components/charts/taskrel-charts";
import { CalendarBlank, FileText, Plus, Receipt } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInvoiceWorkflowState, getInvoiceWorkflowSummary } from "@/lib/workflows/invoice-workflow";
import { createClient } from "@/lib/supabase/server";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_name, client_email, client_phone, total, amount_paid, status, due_date, paid_at, stripe_payment_link, sent_via, created_at, updated_at")
    .eq("contractor_id", contractor?.id)
    .order("created_at", { ascending: false });

  const invoiceRows = invoices ?? [];
  const invoiceStates = invoiceRows.map(invoice => ({ invoice, state: getInvoiceWorkflowState(invoice) }));
  const invoiceSummary = getInvoiceWorkflowSummary(invoiceRows);
  const activeInvoices = invoiceStates
    .filter(({ state }) => state.bucket !== "closed")
    .sort((a, b) => statePriority(b.state.effectiveStatus) - statePriority(a.state.effectiveStatus));
  const outstanding = invoiceSummary.reduce((sum, item) => item.key === "closed" ? sum : sum + item.total, 0);
  const paid = invoiceRows.reduce((sum, invoice) => sum + Number(invoice.amount_paid ?? 0), 0);
  const overdueCount = invoiceStates.filter(({ state }) => state.effectiveStatus === "overdue").length;
  const statusData = invoiceSummary.map(item => ({
    label: item.label,
    value: item.count,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Invoices"
        subtitle="Send what is ready, collect what is due, and keep payment proof visible."
        action={(
          <Link href="/quotes" className="hidden h-11 items-center gap-2 rounded-lg bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f] hover:bg-[#a9c6ff] md:inline-flex">
            <Plus size={18} weight="bold" />
            Review quotes
          </Link>
        )}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <InvoiceMetric label="Prepare" value={String(invoiceSummary.find(item => item.key === "prepare")?.count ?? 0)} detail="Drafts to send" />
        <InvoiceMetric label="Collect" value={formatCurrency(outstanding)} detail={`${overdueCount} overdue`} tone="attention" />
        <InvoiceMetric label="Proof" value={formatCurrency(paid)} detail="Paid so far" tone="success" />
      </div>

      {activeInvoices.length > 0 ? (
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4">
            <div>
              <h2 className="text-lg font-bold text-white">Invoice work queue</h2>
              <p className="text-sm text-[var(--tr-text-muted)]">Derived from delivery, due date, balance, and payment proof.</p>
            </div>
            <Link href="/quotes" className="shrink-0 text-sm font-semibold text-[var(--tr-blue)]">Create from quote</Link>
          </div>
          <div className="divide-y divide-white/10">
            {activeInvoices.map(({ invoice, state }) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block px-4 py-4 transition-colors hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={18} weight="duotone" className="shrink-0 text-[var(--tr-green)]" />
                      <p className="truncate text-sm font-bold text-white">{invoice.client_name}</p>
                      <Badge variant={statusVariant(state.effectiveStatus)}>{state.effectiveStatus}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--tr-text-faint)]">{invoice.invoice_number}</p>
                    <p className="mt-2 text-sm leading-5 text-[var(--tr-text-muted)]">{state.nextActionDetail}</p>
                    {invoice.due_date && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--tr-text-muted)]">
                        <CalendarBlank size={14} weight="duotone" />
                        Due {formatDate(invoice.due_date)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-black text-white">{formatCurrency(state.balanceDue)}</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--tr-blue)]">{state.nextAction}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Surface>
      ) : (
        <Surface className="p-10 text-center">
          <Receipt size={34} weight="duotone" className="mx-auto mb-3 text-slate-500" />
          <p className="font-semibold text-white">{invoiceRows.length > 0 ? "No invoice work right now" : "No invoices yet"}</p>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Approved quotes can become invoices when work is ready to bill.</p>
          <Link href="/quotes" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f]">
            View quotes
          </Link>
        </Surface>
      )}

      <ChartCard title="Invoice workflow" subtitle="Counts by derived payment state">
        <ValueBarChart data={statusData} currency={false} />
      </ChartCard>
    </div>
  );
}

function InvoiceMetric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "attention" | "success";
}) {
  const toneClass = {
    default: "text-white",
    attention: "text-[var(--tr-amber)]",
    success: "text-[var(--tr-green)]",
  }[tone];

  return (
    <Surface className="p-4">
      <p className="text-sm font-semibold text-[var(--tr-text-muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--tr-text-faint)]">{detail}</p>
    </Surface>
  );
}

function statePriority(status: string) {
  if (status === "overdue") return 4;
  if (status === "sent") return 3;
  if (status === "draft") return 2;
  return 1;
}
