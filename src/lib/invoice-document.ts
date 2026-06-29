import type { BusinessSnapshot, Invoice } from "@/types";
import { date, escapeHtml, eyebrow, money, multiline } from "./document-format";

/**
 * Single fixed, print-friendly invoice document. Unlike quotes it does not vary
 * by the contractor's template preset — one solid bill layout for everyone.
 * Same visual language as the quote renderer (light sheet, ink text, one
 * restrained accent, AA contrast) so it survives black-and-white printing, and
 * the same fragment contract so renderDocumentPdf can wrap and print it.
 */

type InvoiceData = Pick<
  Invoice,
  | "invoice_number"
  | "status"
  | "client_name"
  | "client_email"
  | "client_phone"
  | "line_items"
  | "subtotal"
  | "tax_rate"
  | "tax_amount"
  | "total"
  | "amount_paid"
  | "due_date"
  | "paid_at"
  | "stripe_payment_link"
  | "notes"
  | "created_at"
>;

type InvoiceDocumentInput = {
  invoice: InvoiceData;
  business: BusinessSnapshot;
};

const FONT_STACK = "Inter, 'Helvetica Neue', Arial, sans-serif";

// Reuses the quote renderer's NEUTRAL palette: a light, print-safe sheet.
const T = {
  ink: "#111827",
  inkSoft: "#374151",
  muted: "#6B7280",
  faint: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  bg: "#FFFFFF",
  panel: "#F9FAFB",
  // One restrained accent, dark enough to survive a B/W print.
  accent: "#1E3A5F",
};

function contactLine(business: BusinessSnapshot) {
  return [business.business_phone, business.business_website].filter(Boolean).map(escapeHtml).join("  ·  ");
}

function renderLogo(business: BusinessSnapshot) {
  if (business.logo_url) {
    return `<img src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business.business_name)} logo" style="display:block;max-height:48px;max-width:160px;object-fit:contain;" />`;
  }
  return `
    <div style="display:inline-flex;align-items:center;justify-content:center;width:118px;height:40px;border:1px solid ${T.border};border-radius:6px;background:${T.panel};color:${T.faint};font-size:12px;font-weight:600;letter-spacing:.06em;">
      Logo
    </div>
  `;
}

/** PAID / OVERDUE pill rendered in the header when the status calls for it. */
function statusBadge(isPaid: boolean, isOverdue: boolean) {
  if (isPaid) {
    return `<span class="invoice-status-paid" style="display:inline-block;padding:5px 12px;border:1px solid #047857;border-radius:6px;color:#047857;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Paid</span>`;
  }
  if (isOverdue) {
    return `<span class="invoice-status-overdue" style="display:inline-block;padding:5px 12px;border:1px solid #B91C1C;border-radius:6px;color:#B91C1C;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Overdue</span>`;
  }
  return "";
}

/** Bill-to identity block; blank contact lines are dropped. */
function renderBillTo(invoice: InvoiceData) {
  const lines = [invoice.client_email, invoice.client_phone]
    .filter(Boolean)
    .map(value => `<p style="margin:3px 0 0;color:${T.muted};font-size:13px;">${escapeHtml(value)}</p>`)
    .join("");
  return `
    <div class="invoice-bill-to">
      ${eyebrow("Bill to", T.muted)}
      <p style="margin:6px 0 0;color:${T.ink};font-size:15px;font-weight:600;">${escapeHtml(invoice.client_name)}</p>
      ${lines}
    </div>
  `;
}

/** Mobile-friendly line item rows (never a real <table>). */
function renderLineItems(invoice: InvoiceData) {
  const header = `
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(78px,auto) minmax(104px,auto);gap:16px;padding:0 0 8px;border-bottom:1px solid ${T.borderStrong};">
      ${eyebrow("Description", T.muted)}
      <div style="text-align:right;">${eyebrow("Qty / rate", T.muted)}</div>
      <div style="text-align:right;">${eyebrow("Amount", T.muted)}</div>
    </div>
  `;

  const rows = invoice.line_items
    .map(
      item => `
        <div class="invoice-line-row" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(78px,auto) minmax(104px,auto);gap:16px;align-items:start;padding:11px 0;border-bottom:1px solid ${T.border};">
          <div style="min-width:0;">
            <strong style="display:block;color:${T.ink};font-size:14px;font-weight:600;line-height:1.35;">${escapeHtml(item.description)}</strong>
          </div>
          <div style="text-align:right;color:${T.muted};font-size:12.5px;line-height:1.5;">
            <span style="display:block;color:${T.ink};font-weight:600;">${item.quantity} ${escapeHtml(item.unit ?? "")}</span>
            <span style="display:block;color:${T.muted};">${money(item.unit_price)} <span style="color:${T.faint};">/ unit</span></span>
          </div>
          <div style="text-align:right;">
            <strong style="display:block;white-space:nowrap;color:${T.ink};font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;">${money(item.total)}</strong>
          </div>
        </div>`
    )
    .join("");

  return `
    <div class="invoice-line-items" style="margin:18px 0;">
      ${header}
      ${rows}
    </div>
  `;
}

/** Summary: subtotal, tax, total, then amount paid + balance due emphasized. */
function renderSummary(invoice: InvoiceData, displayBalance: number) {
  const row = (label: string, value: string) => `
    <p style="display:flex;justify-content:space-between;gap:24px;margin:7px 0;color:${T.muted};font-size:13px;">
      <span>${label}</span><span style="font-variant-numeric:tabular-nums;">${value}</span>
    </p>
  `;

  return `
    <div class="invoice-summary" style="margin:18px 0 0;display:flex;justify-content:flex-end;">
      <div style="width:100%;max-width:320px;">
        ${row("Subtotal", money(invoice.subtotal))}
        ${invoice.tax_amount > 0 ? row(`Tax (${(invoice.tax_rate * 100).toFixed(1)}%)`, money(invoice.tax_amount)) : ""}
        ${row("Total", money(invoice.total))}
        ${invoice.amount_paid > 0 ? row("Amount paid", `− ${money(invoice.amount_paid)}`) : ""}
        <div style="margin-top:10px;padding-top:12px;border-top:2px solid ${T.ink};">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px;">
            <span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${T.accent};">Balance due</span>
            <span style="color:${T.ink};font-size:26px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1;">${money(displayBalance)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Only http(s) links may be rendered as a clickable href. Blocks javascript:,
 * data:, vbscript: etc. — a defense-in-depth backstop against a tampered
 * stripe_payment_link, since escapeHtml alone does not neutralize the scheme.
 */
function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Clickable "Pay online" CTA — only when a safe http(s) payment link exists. */
function renderPayment(invoice: InvoiceData) {
  if (!isSafeHttpUrl(invoice.stripe_payment_link)) return "";
  return `
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid ${T.border};">
      ${eyebrow("Payment", T.muted)}
      <a class="invoice-pay-link" href="${escapeHtml(invoice.stripe_payment_link)}" style="display:inline-block;margin-top:8px;padding:9px 16px;border:1px solid ${T.accent};border-radius:6px;color:${T.accent};font-size:13px;font-weight:700;text-decoration:none;">Pay online</a>
      <p style="margin:6px 0 0;color:${T.faint};font-size:11.5px;word-break:break-all;">${escapeHtml(invoice.stripe_payment_link)}</p>
    </div>
  `;
}

/** Invoice notes block. */
function renderNotes(invoice: InvoiceData) {
  if (!invoice.notes) return "";
  return `
    <div class="invoice-notes" style="margin-top:20px;">
      ${eyebrow("Notes", T.accent)}
      <p style="margin:6px 0 0;color:${T.inkSoft};font-size:13px;line-height:1.6;">${multiline(invoice.notes)}</p>
    </div>
  `;
}

function renderFooter(business: BusinessSnapshot) {
  const bits = [escapeHtml(business.business_name), contactLine(business), escapeHtml(business.license_text)].filter(Boolean);
  return `
    <div style="margin-top:18px;padding-top:12px;border-top:1px solid ${T.border};color:${T.faint};font-size:11.5px;line-height:1.6;">
      <p style="margin:0;">${bits.join("  ·  ")}</p>
    </div>
  `;
}

export function renderInvoiceDocumentHtml({ invoice, business }: InvoiceDocumentInput): string {
  const balanceDue = Math.max(0, invoice.total - invoice.amount_paid);
  const isPaid = invoice.status === "paid" || balanceDue <= 0;
  const isOverdue = !isPaid && invoice.status === "overdue";
  const displayBalance = isPaid ? 0 : balanceDue;

  const dueDate = invoice.due_date
    ? `<p class="invoice-due-date" style="margin:3px 0 0;color:${T.muted};font-size:12.5px;">Due ${date(invoice.due_date)}</p>`
    : "";

  const inner = `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px 28px;align-items:flex-start;">
      <div>
        ${renderLogo(business)}
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;line-height:1.15;color:${T.ink};">${escapeHtml(business.business_name)}</h1>
        <p style="margin:0;color:${T.muted};font-size:13px;">${contactLine(business)}</p>
        ${business.license_text ? `<p style="margin:4px 0 0;color:${T.faint};font-size:12px;">${escapeHtml(business.license_text)}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <span style="display:inline-block;padding:5px 12px;border:1px solid ${T.accent};border-radius:6px;color:${T.accent};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">INVOICE</span>
        <p style="margin:12px 0 0;color:${T.ink};font-size:15px;font-weight:700;">${escapeHtml(invoice.invoice_number)}</p>
        <p style="margin:3px 0 0;color:${T.muted};font-size:12.5px;">Issued ${date(invoice.created_at)}</p>
        ${dueDate}
        ${isPaid || isOverdue ? `<div style="margin-top:10px;">${statusBadge(isPaid, isOverdue)}</div>` : ""}
      </div>
    </div>

    <div style="height:2px;background:${T.accent};margin:22px 0 24px;border-radius:2px;"></div>

    ${renderBillTo(invoice)}
    ${renderLineItems(invoice)}
    ${renderSummary(invoice, displayBalance)}
    ${renderPayment(invoice)}
    ${renderNotes(invoice)}
    ${renderFooter(business)}
  `;

  return `
    <div class="invoice-document" style="font-family:${FONT_STACK};box-sizing:border-box;width:100%;max-width:760px;margin:0 auto;background:${T.bg};color:${T.ink};padding:clamp(18px,4vw,30px);border-radius:10px;border:1px solid ${T.border};overflow-wrap:anywhere;-webkit-font-smoothing:antialiased;">
      ${inner}
    </div>
  `;
}
