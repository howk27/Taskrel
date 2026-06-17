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
    accent: "#D97706",
    bg: "#F7F4ED",
    border: "#D6CEC0",
    card: "#FFFFFF",
    text: "#1F2937",
    muted: "#6B7280",
    paperText: "#1F2937",
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
  return [business.business_phone, business.email, business.business_website].filter(Boolean).map(escapeHtml).join(" | ");
}

function clientContactLine(quote: QuoteDocumentInput["quote"]) {
  return [quote.client_email, quote.client_phone].filter(Boolean).map(escapeHtml).join(" | ");
}

function scheduledLine(quote: QuoteDocumentInput["quote"]) {
  if (!quote.scheduled_start) return "";
  return `Scheduled: ${datetime(quote.scheduled_start)}${quote.scheduled_end ? ` - ${datetime(quote.scheduled_end)}` : ""}`;
}

function renderLogo(business: BusinessSnapshot, theme: TemplateTheme, variant: "dark" | "light" = "dark") {
  if (business.logo_url) {
    return `<img src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business.business_name)} logo" style="display:block;max-height:54px;max-width:170px;object-fit:contain;margin-bottom:12px;" />`;
  }

  const background = variant === "light" ? "rgba(15,23,42,.025)" : "rgba(255,255,255,.035)";
  const border = variant === "light" ? "rgba(15,23,42,.14)" : "rgba(255,255,255,.16)";
  const color = variant === "light" ? "rgba(15,23,42,.42)" : "rgba(255,255,255,.5)";
  return `
    <div style="width:76px;height:38px;border:1px solid ${border};border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;background:${background};color:${color};font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">
      Logo optional
    </div>
  `;
}

function renderPolicyBlock(business: BusinessSnapshot, theme: TemplateTheme, variant: "classic" | "modern" | "compact") {
  if (!business.quote_policy_text) return "";
  const styles = {
    classic: `background:#0B1220;border:1px solid ${theme.border};color:${theme.muted};`,
    modern: "background:#ECFDF5;border:1px solid #99F6E4;color:#134E4A;",
    compact: `background:#FFFFFF;border:1px solid ${theme.border};color:${theme.text};`,
  };

  return `
    <div style="margin-top:18px;border-radius:14px;padding:14px;${styles[variant]}font-size:13px;line-height:1.55;">
      <p style="margin:0 0 6px;color:${theme.accent};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">Policies &amp; warranty</p>
      <p style="margin:0;">${multiline(business.quote_policy_text)}</p>
    </div>
  `;
}

function renderTermsAndNote(quote: QuoteDocumentInput["quote"], business: BusinessSnapshot, theme: TemplateTheme) {
  const note = quote.notes || business.quote_default_note;
  const terms = business.quote_default_terms;

  return `
    ${note ? `<div style="margin-top:24px;padding-top:18px;border-top:1px solid ${theme.border};"><p style="margin:0 0 6px;color:${theme.muted};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">Client note</p><p style="margin:0;color:${theme.paperText};line-height:1.55;">${multiline(note)}</p></div>` : ""}
    ${terms ? `<div style="margin-top:16px;"><p style="margin:0 0 6px;color:${theme.muted};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">Terms</p><p style="margin:0;color:${theme.muted};font-size:13px;line-height:1.5;">${multiline(terms)}</p></div>` : ""}
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
  return `font-family:Inter,Arial,sans-serif;box-sizing:border-box;width:100%;max-width:${maxWidth}px;margin:0 auto;background:${theme.bg};color:${theme.text};padding:clamp(18px,5vw,34px);border-radius:16px;border:1px solid ${theme.border};overflow-wrap:anywhere;`;
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
      ${detail ? `<span class="quote-line-detail" style="display:block;margin-top:4px;color:${theme.muted};font-size:12px;line-height:1.45;">${escapeHtml(detail)}</span>` : `<span class="quote-line-detail" style="display:none;"></span>`}
    </div>
  `;
}

function renderLineItemRows(quote: QuoteDocumentInput["quote"], theme: TemplateTheme, variant: "classic" | "modern" | "compact") {
  const rowBackground = variant === "modern" ? "#FFFFFF" : variant === "classic" ? theme.card : "transparent";
  const rowBorder = variant === "compact" ? theme.border : theme.border;
  const rowPadding = variant === "compact" ? "14px 0" : "14px";
  const rowRadius = variant === "compact" ? "0" : "13px";

  return quote.line_items
    .map(
      item => `
        <div class="quote-line-row" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;padding:${rowPadding};border-bottom:1px solid ${rowBorder};${variant === "compact" ? "" : `border-radius:${rowRadius};background:${rowBackground};border:1px solid ${rowBorder};margin-bottom:10px;`}">
          <div style="min-width:0;">
            ${renderLineItemCopy(item.description, theme)}
            <span style="display:block;margin-top:7px;color:${theme.muted};font-size:12px;line-height:1.35;">${item.quantity} ${escapeHtml(item.unit ?? "")} x ${money(item.unit_price)}</span>
          </div>
          <strong style="white-space:nowrap;color:${theme.text};font-size:15px;font-variant-numeric:tabular-nums;">${money(item.total)}</strong>
        </div>`
    )
    .join("");
}

function renderClassic({ quote, business }: QuoteDocumentInput) {
  const theme = themes.classic;
  const scheduled = scheduledLine(quote);

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
          <p style="display:inline-block;margin:0;padding:6px 12px;border-radius:999px;background:${theme.accent};color:#111827;font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">Quote</p>
          <p style="margin:14px 0 0;font-size:30px;font-weight:950;color:${theme.text};">${money(quote.total)}</p>
          <p style="margin:4px 0 0;color:${theme.muted};font-size:13px;">Created ${date(quote.created_at)}</p>
        </div>
      </div>

      <div style="background:${theme.card};border:1px solid ${theme.border};border-radius:14px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:${theme.muted};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">Prepared for</p>
        <h2 style="margin:0;color:${theme.text};font-size:19px;">${escapeHtml(quote.client_name)}</h2>
        ${quote.client_address ? `<p style="margin:4px 0;color:${theme.muted};">${escapeHtml(quote.client_address)}</p>` : ""}
        ${clientContactLine(quote) ? `<p style="margin:4px 0;color:${theme.muted};">${clientContactLine(quote)}</p>` : ""}
        ${scheduled ? `<p style="margin:4px 0;color:${theme.muted};">${scheduled}</p>` : ""}
      </div>

      <div class="quote-line-items" style="margin:20px 0;">
        <div style="display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid ${theme.border};padding-bottom:8px;margin-bottom:10px;color:${theme.muted};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">
          <span>Scope</span><span>Amount</span>
        </div>
        ${renderLineItemRows(quote, theme, "classic")}
      </div>

      <div style="background:${theme.accent};color:#111827;border-radius:14px;padding:15px;margin-left:auto;max-width:290px;">
        <p style="display:flex;justify-content:space-between;margin:0;font-size:20px;font-weight:950;"><span>Total</span><span>${money(quote.total)}</span></p>
      </div>

      ${renderTermsAndNote(quote, business, theme)}
      ${renderPolicyBlock(business, theme, "classic")}
      <p style="margin:28px 0 0;color:${theme.muted};font-size:12px;">Sent via Taskrel</p>
    </div>
  `;
}

function renderModern({ quote, business }: QuoteDocumentInput) {
  const theme = themes.modern;
  const scheduled = scheduledLine(quote);

  return `
    <div style="${shellStyle(theme)}">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px 24px;align-items:flex-start;border-bottom:4px solid ${theme.accent};padding-bottom:20px;margin-bottom:24px;">
        <div>
          ${renderLogo(business, theme, "light")}
          <h1 style="font-size:22px;line-height:1.1;margin:0 0 6px;font-weight:900;">${escapeHtml(business.business_name)}</h1>
          <p style="margin:0;color:${theme.muted};font-size:13px;">${contactLine(business)}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;color:${theme.text};font-size:36px;letter-spacing:.04em;font-weight:950;">QUOTE</p>
          <p style="margin:2px 0 0;color:${theme.muted};font-size:13px;">Created ${date(quote.created_at)}</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:24px;">
        <div style="background:#FFFFFF;border:1px solid ${theme.border};border-radius:14px;padding:16px;">
          <p style="margin:0 0 6px;color:${theme.muted};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">From</p>
          <p style="margin:0;color:${theme.text};font-weight:800;">${escapeHtml(business.business_name)}</p>
          ${business.license_text ? `<p style="margin:5px 0 0;color:${theme.muted};font-size:13px;">${escapeHtml(business.license_text)}</p>` : ""}
        </div>
        <div style="background:#FFFFFF;border:1px solid ${theme.border};border-radius:14px;padding:16px;">
          <p style="margin:0 0 6px;color:${theme.muted};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">For</p>
          <p style="margin:0;color:${theme.text};font-weight:800;">${escapeHtml(quote.client_name)}</p>
          ${quote.client_address ? `<p style="margin:5px 0 0;color:${theme.muted};font-size:13px;">${escapeHtml(quote.client_address)}</p>` : ""}
          ${clientContactLine(quote) ? `<p style="margin:5px 0 0;color:${theme.muted};font-size:13px;">${clientContactLine(quote)}</p>` : ""}
          ${scheduled ? `<p style="margin:5px 0 0;color:${theme.muted};font-size:13px;">${scheduled}</p>` : ""}
        </div>
      </div>

      <div class="quote-line-items" style="margin:20px 0;">
        <div style="display:flex;justify-content:space-between;gap:18px;background:${theme.card};border:1px solid ${theme.border};border-radius:12px;padding:10px 12px;margin-bottom:10px;color:${theme.muted};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">
          <span>Description</span><span>Amount</span>
        </div>
        ${renderLineItemRows(quote, theme, "modern")}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;align-items:start;">
        <div style="color:${theme.muted};font-size:13px;line-height:1.55;">${quote.notes ? multiline(quote.notes) : multiline(business.quote_default_note)}</div>
        <div style="background:${theme.accent};color:#FFFFFF;border-radius:14px;padding:16px;">${totalRows(quote, { ...theme, muted: "#CCFBF1", accent: "#FFFFFF" }, "left")}</div>
      </div>

      ${business.quote_default_terms ? `<div style="margin-top:18px;color:${theme.muted};font-size:13px;line-height:1.5;"><strong style="color:${theme.text};">Terms:</strong> ${multiline(business.quote_default_terms)}</div>` : ""}
      ${renderPolicyBlock(business, theme, "modern")}
      <p style="margin:28px 0 0;color:${theme.muted};font-size:12px;">Sent via Taskrel</p>
    </div>
  `;
}

function renderCompact({ quote, business }: QuoteDocumentInput) {
  const theme = themes.compact;
  const scheduled = scheduledLine(quote);

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
          <p style="margin:0;color:${theme.muted};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">Quote total</p>
          <p style="margin:4px 0 0;color:${theme.text};font-size:28px;font-weight:950;">${money(quote.total)}</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:18px;">
        <div style="background:${theme.card};border:1px solid ${theme.border};border-radius:12px;padding:13px;">
          <p style="margin:0 0 5px;color:${theme.muted};font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">Client</p>
          <p style="margin:0;color:${theme.text};font-weight:800;">${escapeHtml(quote.client_name)}</p>
          ${quote.client_address ? `<p style="margin:4px 0 0;color:${theme.muted};font-size:13px;">${escapeHtml(quote.client_address)}</p>` : ""}
        </div>
        ${scheduled ? `<div style="background:${theme.card};border:1px solid ${theme.border};border-radius:12px;padding:13px;">
          <p style="margin:0 0 5px;color:${theme.muted};font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">Schedule</p>
          <p style="margin:0;color:${theme.text};font-weight:800;">${scheduled}</p>
          <p style="margin:4px 0 0;color:${theme.muted};font-size:13px;">Created ${date(quote.created_at)}</p>
        </div>` : `<div style="background:${theme.card};border:1px solid ${theme.border};border-radius:12px;padding:13px;">
          <p style="margin:0 0 5px;color:${theme.muted};font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">Created</p>
          <p style="margin:0;color:${theme.text};font-weight:800;">${date(quote.created_at)}</p>
        </div>`}
      </div>

      <div class="quote-line-items" style="margin-top:16px;">
        <div style="display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid ${theme.border};padding-bottom:8px;color:${theme.muted};font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;">
          <span>Scope</span><span>Amount</span>
        </div>
        ${renderLineItemRows(quote, theme, "compact")}
      </div>

      ${totalRows(quote, theme)}
      ${renderTermsAndNote(quote, business, theme)}
      ${renderPolicyBlock(business, theme, "compact")}
      <p style="margin:28px 0 0;color:${theme.muted};font-size:12px;">Sent via Taskrel</p>
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
