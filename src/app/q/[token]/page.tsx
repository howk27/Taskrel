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
  | "valid_until"
>;

function numberValue(value: number | string | null) {
  return Number(value ?? 0);
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function PublicQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ approved?: string; resend_requested?: string; resend_throttled?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = createAdminClient();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, client_name, client_address, client_email, client_phone, line_items, subtotal, tax_rate, tax_amount, total, notes, scheduled_start, scheduled_end, created_at, status, business_snapshot, template_preset, approved_at, valid_until")
    .eq("public_access_token", token)
    .single<PublicQuoteRow>();

  if (error || !quote || !quote.business_snapshot) notFound();

  const approved = quote.status === "approved";
  const isExpired =
    !approved &&
    quote.valid_until !== null &&
    quote.valid_until !== undefined &&
    new Date() > new Date(quote.valid_until);

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
    <main className="min-h-screen bg-[var(--tr-bg)] px-4 py-5 text-[var(--tr-text)] md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-5 flex items-center justify-between gap-4">
          <TaskrelWordmark size="sm" />
          <span
            className={`rounded-md px-2.5 py-1 text-sm font-semibold ${
              approved
                ? "bg-[var(--tr-badge-success-bg)] text-[var(--tr-badge-success-text)] ring-1 ring-[var(--tr-badge-success-ring)]"
                : isExpired
                  ? "bg-[var(--tr-badge-warning-bg)] text-[var(--tr-badge-warning-text)] ring-1 ring-[var(--tr-badge-warning-ring)]"
                  : "bg-[var(--tr-badge-info-bg)] text-[var(--tr-badge-info-text)] ring-1 ring-[var(--tr-badge-info-ring)]"
            }`}
          >
            {approved ? "Approved" : isExpired ? "Expired" : "Ready to review"}
          </span>
        </nav>

        <section className="mb-5 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5">
          <div className="mt-2 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--tr-text)] md:text-3xl">
                Quote for {quote.client_name}
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--tr-text-muted)]">
                {approved
                  ? "This quote has been approved."
                  : isExpired
                    ? "This quote has expired."
                    : "Review the scope and total below. Approving tells the contractor you are ready to move forward."}
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-sm font-medium text-[var(--tr-text-muted)]">Total</p>
              <p className="text-3xl font-semibold text-[var(--tr-text)]">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                  numberValue(quote.total),
                )}
              </p>
            </div>
          </div>

          {/* Status banners */}
          {query?.approved === "1" && (
            <p className="mt-4 rounded-lg bg-[var(--tr-success-bg)] p-3 text-sm font-semibold text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
              Quote approved. The contractor can now convert it into an invoice.
            </p>
          )}
          {query?.resend_requested === "1" && (
            <p className="mt-4 rounded-lg bg-[var(--tr-success-bg)] p-3 text-sm font-semibold text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
              Resend requested. The contractor will be in touch.
            </p>
          )}
          {query?.resend_throttled === "1" && (
            <p className="mt-4 rounded-lg bg-[var(--tr-warning-bg)] p-3 text-sm font-semibold text-[var(--tr-amber)] shadow-[inset_0_0_0_1px_var(--tr-badge-warning-ring)]">
              Request already sent. Please wait before requesting again.
            </p>
          )}

          {/* CTA area */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            {approved ? (
              <p className="rounded-lg bg-[var(--tr-success-bg)] p-3 text-sm font-semibold text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
                This quote has been approved{quote.approved_at ? ` on ${formatShortDate(quote.approved_at)}` : ""}.
              </p>
            ) : isExpired ? (
              <>
                <p className="text-sm font-semibold text-[var(--tr-amber)]">
                  Quote expired {quote.valid_until ? formatShortDate(quote.valid_until) : ""}.
                </p>
                <form action={`/api/public/quotes/${token}/request-resend`} method="post">
                  <button
                    type="submit"
                    className="tr-primary-action inline-flex h-12 w-full items-center justify-center rounded-lg px-5 text-sm font-semibold sm:w-auto"
                  >
                    Request resend
                  </button>
                </form>
              </>
            ) : (
              <form action={`/api/public/quotes/${token}/approve`} method="post">
                <button
                  type="submit"
                  className="tr-primary-action inline-flex h-12 w-full items-center justify-center rounded-lg px-5 text-sm font-semibold sm:w-auto"
                >
                  Approve quote
                </button>
              </form>
            )}
            <a
              href={`/api/public/quotes/${token}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[var(--tr-border-soft)] px-5 text-sm font-semibold text-[var(--tr-text)] hover:bg-[var(--tr-bg-soft)] sm:w-auto"
            >
              Download PDF
            </a>
          </div>
        </section>

        <div className="overflow-hidden rounded-lg">
          <div dangerouslySetInnerHTML={{ __html: quoteHtml }} />
        </div>
      </div>
    </main>
  );
}
