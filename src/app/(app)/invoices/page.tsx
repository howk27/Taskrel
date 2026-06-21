import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { ChartCard, ValueBarChart } from "@/components/charts/taskrel-charts";
import { CalendarBlank, FileText, Receipt } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatCurrency, formatDate } from "@/lib/format";
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
    .select("id, invoice_number, client_name, total, amount_paid, status, due_date, created_at")
    .eq("contractor_id", contractor?.id)
    .order("created_at", { ascending: false });

  const invoiceRows = invoices ?? [];
  const outstanding = invoiceRows.reduce((sum, invoice) => {
    if (invoice.status === "paid") return sum;
    return sum + Math.max(Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0), 0);
  }, 0);
  const paid = invoiceRows.reduce((sum, invoice) => sum + Number(invoice.amount_paid ?? 0), 0);
  const overdueCount = invoiceRows.filter(invoice => invoice.status === "overdue").length;
  const statusData = ["draft", "sent", "paid", "overdue"].map(status => ({
    label: status[0].toUpperCase() + status.slice(1),
    value: invoiceRows.filter(invoice => invoice.status === status).length,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        eyebrow="Cash flow"
        title="Invoices"
        subtitle="See what is paid, what is due, and where follow-up is needed."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <InvoiceMetric label="Outstanding" value={formatCurrency(outstanding)} tone="attention" />
        <InvoiceMetric label="Paid so far" value={formatCurrency(paid)} tone="success" />
        <InvoiceMetric label="Overdue" value={String(overdueCount)} tone="risk" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
        <ChartCard title="Invoice status" subtitle="Counts by current payment state">
          <ValueBarChart data={statusData} currency={false} />
        </ChartCard>

        <Surface className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--tr-green)]/15 text-[var(--tr-green)]">
              <Receipt size={24} weight="duotone" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Payment workflow</h2>
              <p className="text-sm text-[var(--tr-text-muted)]">Approved quotes can become invoices.</p>
            </div>
          </div>
          <Link
            href="/quotes"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--tr-orange)] px-4 text-sm font-bold text-[#241205]"
          >
            Review quotes
          </Link>
        </Surface>
      </div>

      {invoiceRows.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {invoiceRows.map(invoice => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block">
              <Surface className="p-4 transition-colors hover:border-[var(--tr-border)] hover:bg-[var(--tr-surface-2)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={18} weight="duotone" className="shrink-0 text-[var(--tr-green)]" />
                      <p className="truncate text-sm font-semibold text-white">{invoice.client_name}</p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--tr-text-faint)]">{invoice.invoice_number}</p>
                    {invoice.due_date && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--tr-text-muted)]">
                        <CalendarBlank size={14} weight="duotone" />
                        Due {formatDate(invoice.due_date)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold text-white">{formatCurrency(invoice.total)}</p>
                    <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                  </div>
                </div>
              </Surface>
            </Link>
          ))}
        </div>
      ) : (
        <Surface className="p-10 text-center">
          <Receipt size={34} weight="duotone" className="mx-auto mb-3 text-slate-500" />
          <p className="font-semibold text-white">No invoices yet</p>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Approve a quote to convert it into an invoice.</p>
          <Link href="/quotes" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--tr-orange)] px-4 text-sm font-bold text-[#241205]">
            View quotes
          </Link>
        </Surface>
      )}
    </div>
  );
}

function InvoiceMetric({ label, value, tone }: { label: string; value: string; tone: "attention" | "success" | "risk" }) {
  const toneClass = {
    attention: "text-[var(--tr-amber)]",
    success: "text-[var(--tr-green)]",
    risk: "text-red-300",
  }[tone];

  return (
    <Surface className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${toneClass}`}>{value}</p>
    </Surface>
  );
}
