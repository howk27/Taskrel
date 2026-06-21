import { notFound } from "next/navigation";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderQuoteDocumentHtml } from "@/lib/quote-document";
import type { BusinessSnapshot, Quote, QuoteTemplatePreset } from "@/types";

export const dynamic = "force-dynamic";

type PublicQuoteRow = Pick<
  Quote,
  | "id"
  | "client_name"
  | "client_address"
  | "client_email"
  | "client_phone"
  | "line_items"
  | "subtotal"
  | "tax_rate"
  | "tax_amount"
  | "total"
  | "notes"
  | "scheduled_start"
  | "scheduled_end"
  | "created_at"
  | "status"
  | "business_snapshot"
  | "template_preset"
  | "approved_at"
>;

function numberValue(value: number | string | null) {
  return Number(value ?? 0);
}

export default async function PublicQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ approved?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = createAdminClient();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, client_name, client_address, client_email, client_phone, line_items, subtotal, tax_rate, tax_amount, total, notes, scheduled_start, scheduled_end, created_at, status, business_snapshot, template_preset, approved_at")
    .eq("public_access_token", token)
    .single<PublicQuoteRow>();

  if (error || !quote || !quote.business_snapshot) notFound();

  const approved = quote.status === "approved";
  const quoteHtml = renderQuoteDocumentHtml({
    quote: {
      ...quote,
      subtotal: numberValue(quote.subtotal),
      tax_rate: numberValue(quote.tax_rate),
      tax_amount: numberValue(quote.tax_amount),
      total: numberValue(quote.total),
    },
    business: quote.business_snapshot as BusinessSnapshot,
    preset: (quote.template_preset ?? "classic") as QuoteTemplatePreset,
  });

  return (
    <main className="min-h-screen bg-[var(--tr-bg)] px-4 py-5 text-white md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-5 flex items-center justify-between gap-4">
          <TaskrelWordmark size="sm" />
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${approved ? "bg-[var(--tr-green)]/12 text-[var(--tr-green)]" : "bg-[var(--tr-info)]/12 text-[var(--tr-info)]"}`}>
            {approved ? "Approved" : "Ready to review"}
          </span>
        </nav>

        <section className="mb-5 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5">
          <p className="text-xs font-bold text-[var(--tr-amber)]">Client quote</p>
          <div className="mt-2 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                Quote for {quote.client_name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tr-text-muted)]">
                Review the scope and total below. Approving tells the contractor you are ready to move forward.
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--tr-text-faint)]">Total</p>
              <p className="text-3xl font-black text-white">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numberValue(quote.total))}
              </p>
            </div>
          </div>

          {query?.approved === "1" && (
            <p className="mt-4 rounded-lg border border-[var(--tr-green)]/25 bg-[var(--tr-green)]/10 p-3 text-sm font-semibold text-emerald-100">
              Quote approved. The contractor can now convert it into an invoice.
            </p>
          )}

          <div className="mt-5">
            {approved ? (
              <p className="rounded-lg border border-[var(--tr-green)]/25 bg-[var(--tr-green)]/10 p-3 text-sm font-semibold text-emerald-100">
                This quote has been approved{quote.approved_at ? ` on ${new Date(quote.approved_at).toLocaleDateString()}` : ""}.
              </p>
            ) : (
              <form action={`/api/public/quotes/${token}/approve`} method="post">
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[var(--tr-orange)] px-5 text-sm font-black text-[#241205] transition-colors hover:bg-[var(--tr-amber)] sm:w-auto"
                >
                  Approve quote
                </button>
              </form>
            )}
          </div>
        </section>

        <div className="overflow-hidden rounded-xl">
          <div dangerouslySetInnerHTML={{ __html: quoteHtml }} />
        </div>
      </div>
    </main>
  );
}
