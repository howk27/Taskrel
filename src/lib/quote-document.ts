import type { BusinessSnapshot, Contractor, Quote, QuoteTemplatePreset } from "@/types";

type BusinessSource = Pick<
  Contractor,
  | "business_name"
  | "email"
  | "logo_url"
  | "business_phone"
  | "business_website"
  | "license_text"
  | "quote_default_terms"
  | "quote_default_note"
>;

type QuoteDocumentInput = {
  quote: Pick<
    Quote,
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
  >;
  business: BusinessSnapshot;
  preset: QuoteTemplatePreset;
};

const presetStyles: Record<QuoteTemplatePreset, { accent: string; bg: string; border: string; text: string; muted: string }> = {
  classic: {
    accent: "#F97316",
    bg: "#0F172A",
    border: "#334155",
    text: "#FFFFFF",
    muted: "#CBD5E1",
  },
  modern: {
    accent: "#22C55E",
    bg: "#111827",
    border: "#374151",
    text: "#F9FAFB",
    muted: "#D1D5DB",
  },
  compact: {
    accent: "#F97316",
    bg: "#FFFFFF",
    border: "#E2E8F0",
    text: "#0F172A",
    muted: "#475569",
  },
};

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function date(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function datetime(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function buildBusinessSnapshot(contractor: BusinessSource): BusinessSnapshot {
  return {
    business_name: contractor.business_name,
    email: contractor.email,
    logo_url: contractor.logo_url,
    business_phone: contractor.business_phone,
    business_website: contractor.business_website,
    license_text: contractor.license_text,
    quote_default_terms: contractor.quote_default_terms,
    quote_default_note: contractor.quote_default_note,
  };
}

export function renderQuoteDocumentHtml({ quote, business, preset }: QuoteDocumentInput) {
  const style = presetStyles[preset] ?? presetStyles.classic;
  const isCompact = preset === "compact";
  const lineItems = quote.line_items
    .map(
      item => `
        <tr>
          <td style="padding:${isCompact ? "8px" : "12px"} 0;border-bottom:1px solid ${style.border};color:${style.text};">
            <strong>${escapeHtml(item.description)}</strong>
          </td>
          <td style="padding:${isCompact ? "8px" : "12px"} 0;border-bottom:1px solid ${style.border};text-align:right;color:${style.muted};">
            ${item.quantity} ${escapeHtml(item.unit ?? "")}
          </td>
          <td style="padding:${isCompact ? "8px" : "12px"} 0;border-bottom:1px solid ${style.border};text-align:right;color:${style.muted};">
            ${money(item.unit_price)}
          </td>
          <td style="padding:${isCompact ? "8px" : "12px"} 0;border-bottom:1px solid ${style.border};text-align:right;color:${style.text};font-weight:700;">
            ${money(item.total)}
          </td>
        </tr>`
    )
    .join("");

  const logo = business.logo_url
    ? `<img src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business.business_name)} logo" style="max-height:48px;max-width:160px;object-fit:contain;margin-bottom:12px;" />`
    : "";

  const scheduled = quote.scheduled_start
    ? `<p style="margin:4px 0;color:${style.muted};">Scheduled: ${datetime(quote.scheduled_start)}${quote.scheduled_end ? ` - ${datetime(quote.scheduled_end)}` : ""}</p>`
    : "";

  const note = quote.notes || business.quote_default_note;
  const terms = business.quote_default_terms;

  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:720px;margin:0 auto;background:${style.bg};color:${style.text};padding:${isCompact ? "24px" : "32px"};border-radius:14px;border:1px solid ${style.border};">
      <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:${isCompact ? "20px" : "32px"};">
        <div>
          ${logo}
          <h1 style="font-size:${isCompact ? "22px" : "28px"};line-height:1.1;margin:0 0 8px;font-weight:800;">${escapeHtml(business.business_name)}</h1>
          <p style="margin:0;color:${style.muted};font-size:14px;">${[business.business_phone, business.email, business.business_website].filter(Boolean).map(escapeHtml).join(" | ")}</p>
          ${business.license_text ? `<p style="margin:6px 0 0;color:${style.muted};font-size:13px;">${escapeHtml(business.license_text)}</p>` : ""}
        </div>
        <div style="text-align:right;">
          <p style="margin:0;color:${style.accent};font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;">Quote</p>
          <p style="margin:6px 0 0;color:${style.muted};font-size:14px;">Created ${date(quote.created_at)}</p>
        </div>
      </div>

      <div style="border-top:1px solid ${style.border};border-bottom:1px solid ${style.border};padding:${isCompact ? "14px" : "18px"} 0;margin-bottom:${isCompact ? "18px" : "28px"};">
        <p style="margin:0 0 4px;color:${style.muted};font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;">Prepared for</p>
        <h2 style="margin:0;color:${style.text};font-size:18px;">${escapeHtml(quote.client_name)}</h2>
        ${quote.client_address ? `<p style="margin:4px 0;color:${style.muted};">${escapeHtml(quote.client_address)}</p>` : ""}
        ${[quote.client_email, quote.client_phone].filter(Boolean).length ? `<p style="margin:4px 0;color:${style.muted};">${[quote.client_email, quote.client_phone].filter(Boolean).map(escapeHtml).join(" | ")}</p>` : ""}
        ${scheduled}
      </div>

      <table style="width:100%;border-collapse:collapse;margin:${isCompact ? "12px" : "20px"} 0;">
        <thead>
          <tr style="color:${style.muted};font-size:12px;text-transform:uppercase;letter-spacing:.06em;">
            <th style="padding:0 0 10px;text-align:left;">Item</th>
            <th style="padding:0 0 10px;text-align:right;">Qty</th>
            <th style="padding:0 0 10px;text-align:right;">Rate</th>
            <th style="padding:0 0 10px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${lineItems}</tbody>
      </table>

      <div style="margin-left:auto;max-width:260px;padding-top:8px;">
        <p style="display:flex;justify-content:space-between;margin:6px 0;color:${style.muted};"><span>Subtotal</span><span>${money(quote.subtotal)}</span></p>
        ${quote.tax_amount > 0 ? `<p style="display:flex;justify-content:space-between;margin:6px 0;color:${style.muted};"><span>Tax ${(quote.tax_rate * 100).toFixed(1)}%</span><span>${money(quote.tax_amount)}</span></p>` : ""}
        <p style="display:flex;justify-content:space-between;margin:10px 0 0;color:${style.accent};font-size:22px;font-weight:800;"><span>Total</span><span>${money(quote.total)}</span></p>
      </div>

      ${note ? `<div style="margin-top:28px;padding-top:20px;border-top:1px solid ${style.border};"><p style="margin:0 0 6px;color:${style.muted};font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;">Client note</p><p style="margin:0;color:${style.text};line-height:1.55;">${escapeHtml(note)}</p></div>` : ""}
      ${terms ? `<div style="margin-top:18px;"><p style="margin:0 0 6px;color:${style.muted};font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;">Terms</p><p style="margin:0;color:${style.muted};font-size:13px;line-height:1.5;">${escapeHtml(terms)}</p></div>` : ""}
      <p style="margin:28px 0 0;color:${style.muted};font-size:12px;">Sent via Taskrel</p>
    </div>
  `;
}
