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
  | "quote_policy_text"
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

type TemplateTheme = {
  accent: string;
  bg: string;
  border: string;
  card: string;
  text: string;
  muted: string;
  paperText: string;
};

const themes: Record<QuoteTemplatePreset, TemplateTheme> = {
  classic: {
    accent: "#F59E0B",
    bg: "#111827",
    border: "#374151",
    card: "#1F2937",
    text: "#FFFFFF",
    muted: "#CBD5E1",
    paperText: "#E5E7EB",
  },
  modern: {
    accent: "#0F766E",
    bg: "#F8FAFC",
    border: "#CBD5E1",
    card: "#E2E8F0",
    text: "#111827",
    muted: "#64748B",
    paperText: "#111827",
  },
  compact: {
    accent: "#F59E0B",
    bg: "#F8FAFC",
    border: "#CBD5E1",
    card: "#FFFFFF",
    text: "#111827",
    muted: "#64748B",
    paperText: "#111827",
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

function multiline(value: string | null | undefined) {
  return escapeHtml(value).replace(/\n/g, "<br />");
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

function contactLine(business: BusinessSnapshot) {
  return [business.business_phone, business.business_website].filter(Boolean).map(escapeHtml).join(" | ");
}

function clientContactLine(quote: QuoteDocumentInput["quote"]) {
  return [quote.client_email, quote.client_phone].filter(Boolean).map(escapeHtml).join(" | ");
}

function scheduledLine(quote: QuoteDocumentInput["quote"]) {
  if (!quote.scheduled_start) return "";
  return `${datetime(quote.scheduled_start)}${quote.scheduled_end ? ` - ${datetime(quote.scheduled_end)}` : ""}`;
}

function renderLogo(business: BusinessSnapshot, theme: TemplateTheme, variant: "dark" | "light" = "dark") {
  if (business.logo_url) {
    return `<img src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business.business_name)} logo" style="display:block;max-height:54px;max-width:170px;object-fit:contain;margin-bottom:12px;" />`;
  }

  const background = variant === "light" ? "rgba(15,23,42,.025)" : "rgba(255,255,255,.035)";
  const border = variant === "light" ? "rgba(15,23,42,.14)" : "rgba(255,255,255,.16)";
  const color = variant === "light" ? "rgba(15,23,42,.42)" : "rgba(255,255,255,.5)";
  return `
    <div style="width:76px;height:38px;border:1px solid ${border};border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;background:${background};color:${color};font-size:13px;font-weight:700;">
      Logo
    </div>
  `;
}

function renderPolicyBlock(business: BusinessSnapshot, theme: TemplateTheme, variant: "classic" | "modern" | "compact") {
  if (!business.quote_policy_text) return "";
  const styles = {
    classic: `border-top:1px solid ${theme.border};color:${theme.muted};`,
    modern: `border-top:1px solid ${theme.border};color:${theme.muted};`,
    compact: `background:#FFFFFF;border:1px solid ${theme.border};color:${theme.text};`,
  };

  return `
    <div class="quote-document-policies" style="margin-top:18px;padding:${variant === "compact" ? "14px" : "14px 0 0"};${styles[variant]}font-size:13px;line-height:1.55;">
      <p style="margin:0 0 6px;color:${theme.accent};font-size:13px;font-weight:800;">Policies &amp; warranty</p>
      <p style="margin:0;">${multiline(business.quote_policy_text)}</p>
    </div>
  `;
}

function renderTermsAndNote(quote: QuoteDocumentInput["quote"], business: BusinessSnapshot, theme: TemplateTheme) {
  const note = quote.notes || business.quote_default_note;
  const terms = business.quote_default_terms;

  return `
    ${note ? `<div class="quote-document-notes" style="margin-top:24px;padding-top:18px;border-top:1px solid ${theme.border};"><p style="margin:0 0 6px;color:${theme.text};font-size:13px;font-weight:800;">Client note</p><p style="margin:0;color:${theme.paperText};line-height:1.55;">${multiline(note)}</p></div>` : ""}
    ${terms ? `<div class="quote-document-terms" style="margin-top:16px;"><p style="margin:0 0 6px;color:${theme.text};font-size:13px;font-weight:800;">Terms</p><p style="margin:0;color:${theme.muted};font-size:13px;line-height:1.5;">${multiline(terms)}</p></div>` : ""}
  `;
}

function totalRows(quote: QuoteDocumentInput["quote"], theme: TemplateTheme, align = "right") {
  return `
    <div class="quote-total-box" style="margin-left:${align === "right" ? "auto" : "0"};width:100%;max-width:310px;padding-top:8px;">
      <p style="display:flex;justify-content:space-between;gap:16px;margin:6px 0;color:${theme.muted};"><span>Subtotal</span><span style="font-variant-numeric:tabular-nums;">${money(quote.subtotal)}</span></p>
      ${quote.tax_amount > 0 ? `<p style="display:flex;justify-content:space-between;gap:16px;margin:6px 0;color:${theme.muted};"><span>Tax ${(quote.tax_rate * 100).toFixed(1)}%</span><span style="font-variant-numeric:tabular-nums;">${money(quote.tax_amount)}</span></p>` : ""}
      <p style="display:flex;justify-content:space-between;gap:16px;margin:10px 0 0;color:${theme.accent};font-size:22px;font-weight:900;"><span>Total</span><span style="font-variant-numeric:tabular-nums;">${money(quote.total)}</span></p>
    </div>
  `;
}

function shellStyle(theme: TemplateTheme, maxWidth = 760) {
  return `font-family:Inter,Arial,sans-serif;box-sizing:border-box;width:100%;max-width:${maxWidth}px;margin:0 auto;background:${theme.bg};color:${theme.text};padding:clamp(18px,5vw,34px);border-radius:8px;border:1px solid ${theme.border};overflow-wrap:anywhere;`;
}

function summaryItem(label: string, value: string, theme: TemplateTheme) {
  if (!value) return "";
  return `
    <div>
      <p style="margin:0 0 4px;color:${theme.muted};font-size:12px;font-weight:800;">${label}</p>
      <p style="margin:0;color:${theme.text};font-size:14px;font-weight:700;line-height:1.45;">${value}</p>
    </div>
  `;
}

function renderDocumentSummary(quote: QuoteDocumentInput["quote"], theme: TemplateTheme, card = theme.card) {
  const scheduled = scheduledLine(quote);
  const contact = clientContactLine(quote);

  return `
    <div class="quote-document-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;background:${card};border:1px solid ${theme.border};border-radius:8px;padding:14px;margin-bottom:22px;">
      ${summaryItem("Prepared for", escapeHtml(quote.client_name), theme)}
      ${summaryItem("Quote date", date(quote.created_at), theme)}
      ${quote.client_address ? summaryItem("Job location", escapeHtml(quote.client_address), theme) : ""}
      ${contact ? summaryItem("Client contact", contact, theme) : ""}
      ${scheduled ? summaryItem("Scheduled work", scheduled, theme) : ""}
    </div>
  `;
}

function splitLineItemDescription(description: string) {
  const clean = description.trim().replace(/\s+/g, " ");
  if (clean.length <= 76) return { title: clean, detail: "" };

  const sentenceMatch = clean.match(/^(.{24,82}?[.!?])\s+(.+)$/);
  if (sentenceMatch) {
    return {
      title: sentenceMatch[1].replace(/[.!?]$/, ""),
      detail: sentenceMatch[2],
    };
  }

  const commaIndex = clean.indexOf(", ");
  if (commaIndex >= 28 && commaIndex <= 82) {
    return {
      title: clean.slice(0, commaIndex),
      detail: clean.slice(commaIndex + 2),
    };
  }

  const softLimit = clean.slice(0, 76);
  const lastSpace = softLimit.lastIndexOf(" ");
  const cut = lastSpace > 36 ? lastSpace : 76;
  return {
    title: clean.slice(0, cut),
    detail: clean.slice(cut).trim(),
  };
}

function renderLineItemCopy(description: string, theme: TemplateTheme) {
  const { title, detail } = splitLineItemDescription(description);
  return `
    <div>
      <strong class="quote-line-title" style="display:block;color:${theme.text};font-size:14px;line-height:1.32;">${escapeHtml(title)}</strong>
      ${detail ? `<span class="quote-line-detail" style="display:block;margin-top:4px;color:${theme.muted};font-size:13px;line-height:1.45;">${escapeHtml(detail)}</span>` : `<span class="quote-line-detail" style="display:none;"></span>`}
    </div>
  `;
}

function renderLineItemRows(quote: QuoteDocumentInput["quote"], theme: TemplateTheme, variant: "classic" | "modern" | "compact") {
  const rowBorder = variant === "compact" ? theme.border : theme.border;
  const rowPadding = variant === "compact" ? "14px 0" : "14px";
  return quote.line_items
    .map(
      item => `
        <div class="quote-line-row" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(92px,auto) minmax(110px,auto);gap:14px;align-items:start;padding:${rowPadding};border-bottom:1px solid ${rowBorder};">
          <div style="min-width:0;">
            ${renderLineItemCopy(item.description, theme)}
          </div>
          <div class="quote-line-quantity" style="color:${theme.muted};font-size:13px;line-height:1.45;">
            <span style="display:block;font-size:12px;font-weight:800;">Qty</span>
            <span style="display:block;color:${theme.text};font-weight:700;">${item.quantity} ${escapeHtml(item.unit ?? "")}</span>
          </div>
          <div style="text-align:right;">
            <div class="quote-line-unit-price" style="margin-bottom:6px;color:${theme.muted};font-size:13px;line-height:1.45;">
              <span style="display:block;font-size:12px;font-weight:800;">Unit price</span>
              <span style="display:block;color:${theme.text};font-weight:700;font-variant-numeric:tabular-nums;">${money(item.unit_price)}</span>
            </div>
            <strong class="quote-line-amount" style="display:block;white-space:nowrap;color:${theme.text};font-size:15px;font-variant-numeric:tabular-nums;">${money(item.total)}</strong>
          </div>
        </div>`
    )
    .join("");
}

function renderClassic({ quote, business }: QuoteDocumentInput) {
  const theme = themes.classic;

  return `
    <div style="${shellStyle(theme)}">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px 26px;align-items:flex-start;margin-bottom:26px;">
        <div>
          ${renderLogo(business, theme)}
          <h1 style="font-size:28px;line-height:1.1;margin:0 0 8px;font-weight:900;">${escapeHtml(business.business_name)}</h1>
          <p style="margin:0;color:${theme.muted};font-size:14px;">${contactLine(business)}</p>
          ${business.license_text ? `<p style="margin:6px 0 0;color:${theme.muted};font-size:13px;">${escapeHtml(business.license_text)}</p>` : ""}
        </div>
        <div style="text-align:right;">
          <p style="display:inline-block;margin:0;padding:6px 12px;border-radius:8px;background:${theme.accent};color:#111827;font-size:13px;font-weight:900;">Quote</p>
          <p style="margin:14px 0 0;font-size:30px;font-weight:950;color:${theme.text};">${money(quote.total)}</p>
          <p style="margin:4px 0 0;color:${theme.muted};font-size:13px;">${date(quote.created_at)}</p>
        </div>
      </div>

      ${renderDocumentSummary(quote, theme)}

      <div class="quote-line-items" style="margin:20px 0;">
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(92px,auto) minmax(110px,auto);gap:14px;border-bottom:1px solid ${theme.border};padding-bottom:8px;margin-bottom:10px;color:${theme.muted};font-size:13px;font-weight:800;">
          <span>Scope</span><span>Quantity</span><span style="text-align:right;">Pricing</span>
        </div>
        ${renderLineItemRows(quote, theme, "classic")}
      </div>

      <div style="background:${theme.card};border:1px solid ${theme.border};border-radius:8px;padding:14px;margin-left:auto;max-width:340px;">
        ${totalRows(quote, theme)}
      </div>

      ${renderTermsAndNote(quote, business, theme)}
      ${renderPolicyBlock(business, theme, "classic")}
    </div>
  `;
}

function renderModern({ quote, business }: QuoteDocumentInput) {
  const theme = themes.modern;

  return `
    <div style="${shellStyle(theme)}">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px 24px;align-items:flex-start;border-bottom:4px solid ${theme.accent};padding-bottom:20px;margin-bottom:24px;">
        <div>
          ${renderLogo(business, theme, "light")}
          <h1 style="font-size:22px;line-height:1.1;margin:0 0 6px;font-weight:900;">${escapeHtml(business.business_name)}</h1>
          <p style="margin:0;color:${theme.muted};font-size:13px;">${contactLine(business)}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;color:${theme.text};font-size:32px;font-weight:950;">Quote</p>
          <p style="margin:2px 0 0;color:${theme.muted};font-size:13px;">${date(quote.created_at)}</p>
        </div>
      </div>

      ${renderDocumentSummary(quote, theme, "#FFFFFF")}

      <div class="quote-line-items" style="margin:20px 0;">
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(92px,auto) minmax(110px,auto);gap:14px;background:${theme.card};border:1px solid ${theme.border};border-radius:8px;padding:10px 12px;margin-bottom:10px;color:${theme.muted};font-size:13px;font-weight:800;">
          <span>Description</span><span>Quantity</span><span style="text-align:right;">Pricing</span>
        </div>
        ${renderLineItemRows(quote, theme, "modern")}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;align-items:start;">
        <div>${renderTermsAndNote(quote, business, theme)}</div>
        <div style="background:${theme.accent};color:#FFFFFF;border-radius:8px;padding:16px;">${totalRows(quote, { ...theme, muted: "#CCFBF1", accent: "#FFFFFF" }, "left")}</div>
      </div>

      ${renderPolicyBlock(business, theme, "modern")}
    </div>
  `;
}

function renderCompact({ quote, business }: QuoteDocumentInput) {
  const theme = themes.compact;

  return `
    <div style="${shellStyle(theme, 720)}">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px 24px;align-items:flex-start;border-bottom:2px solid ${theme.accent};padding-bottom:18px;margin-bottom:18px;">
        <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;">
          ${renderLogo(business, theme, "light")}
          <div>
            <h1 style="font-size:23px;line-height:1.1;margin:0 0 6px;font-weight:950;">${escapeHtml(business.business_name)}</h1>
            <p style="margin:0;color:${theme.muted};font-size:13px;">${contactLine(business)}</p>
          </div>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;color:${theme.muted};font-size:13px;font-weight:800;">Quote total</p>
          <p style="margin:4px 0 0;color:${theme.text};font-size:28px;font-weight:950;">${money(quote.total)}</p>
        </div>
      </div>

      ${renderDocumentSummary(quote, theme)}

      <div class="quote-line-items" style="margin-top:16px;">
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(92px,auto) minmax(110px,auto);gap:14px;border-bottom:1px solid ${theme.border};padding-bottom:8px;color:${theme.muted};font-size:13px;font-weight:800;">
          <span>Scope</span><span>Quantity</span><span style="text-align:right;">Pricing</span>
        </div>
        ${renderLineItemRows(quote, theme, "compact")}
      </div>

      ${totalRows(quote, theme)}
      ${renderTermsAndNote(quote, business, theme)}
      ${renderPolicyBlock(business, theme, "compact")}
    </div>
  `;
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
    quote_policy_text: contractor.quote_policy_text,
  };
}

export function renderQuoteDocumentHtml(input: QuoteDocumentInput) {
  switch (input.preset) {
    case "modern":
      return renderModern(input);
    case "compact":
      return renderCompact(input);
    case "classic":
    default:
      return renderClassic(input);
  }
}
