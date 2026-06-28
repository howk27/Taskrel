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

type QuoteData = QuoteDocumentInput["quote"];

/**
 * Design tokens for a single direction. Every direction is a clean, light,
 * print-friendly contractor document: white/near-white background, ink text,
 * one restrained accent. No dark panels, no bright total buttons, no email
 * hero blocks. Accents are dark enough to survive a black-and-white print.
 */
type DocTokens = {
  /** Display label for the document type, e.g. "Estimate". */
  docLabel: string;
  /** Single subtle accent — thin rules, small labels, the document tag. */
  accent: string;
  /** Very light tint of the accent for label chips / section headers. */
  accentSoft: string;
  /** Primary body + total ink. */
  ink: string;
  /** Secondary heading ink. */
  inkSoft: string;
  /** Muted supporting copy. */
  muted: string;
  /** Faint hints (placeholders, footnotes). */
  faint: string;
  /** Hairline rules and box borders. */
  border: string;
  /** Slightly stronger rule for emphasis. */
  borderStrong: string;
  /** Page background. */
  bg: string;
  /** Very light panel fill for boxed sections. */
  panel: string;
};

const FONT_STACK = "Inter, 'Helvetica Neue', Arial, sans-serif";

const NEUTRAL = {
  ink: "#111827",
  inkSoft: "#374151",
  muted: "#6B7280",
  faint: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  bg: "#FFFFFF",
  panel: "#F9FAFB",
};

const themes: Record<QuoteTemplatePreset, DocTokens> = {
  // Direction 1 — Executive Estimate: polished, structured business document.
  classic: {
    ...NEUTRAL,
    docLabel: "Estimate",
    accent: "#1E3A5F",
    accentSoft: "#EEF2F7",
  },
  // Direction 3 — Premium Proposal: refined, whitespace-led, restrained.
  modern: {
    ...NEUTRAL,
    docLabel: "Proposal",
    accent: "#6B5B4A",
    accentSoft: "#F4F1EC",
    bg: "#FFFFFF",
    panel: "#FAFAF8",
  },
  // Direction 2 — Contractor Work Order: practical, field-service, lightly boxed.
  compact: {
    ...NEUTRAL,
    docLabel: "Work Order",
    accent: "#3F4854",
    accentSoft: "#F1F3F5",
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
  return [business.business_phone, business.business_website].filter(Boolean).map(escapeHtml).join("  ·  ");
}

function clientContactLine(quote: QuoteData) {
  return [quote.client_email, quote.client_phone].filter(Boolean).map(escapeHtml).join("  ·  ");
}

function scheduledLine(quote: QuoteData) {
  if (!quote.scheduled_start) return "";
  return `${datetime(quote.scheduled_start)}${quote.scheduled_end ? ` – ${datetime(quote.scheduled_end)}` : ""}`;
}

/**
 * Subtle, light logo placeholder. Never a dominant dashed box. When a real
 * logo exists it is constrained so it cannot blow out the header.
 */
function renderLogo(business: BusinessSnapshot, t: DocTokens) {
  if (business.logo_url) {
    return `<img src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business.business_name)} logo" style="display:block;max-height:48px;max-width:160px;object-fit:contain;" />`;
  }
  return `
    <div style="display:inline-flex;align-items:center;justify-content:center;width:118px;height:40px;border:1px solid ${t.border};border-radius:6px;background:${t.panel};color:${t.faint};font-size:12px;font-weight:600;letter-spacing:.06em;">
      Logo
    </div>
  `;
}

/** Small uppercase eyebrow label used throughout the documents. */
function eyebrow(label: string, color: string) {
  return `<span style="display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${color};">${escapeHtml(label)}</span>`;
}

/**
 * Fixed client / project block. Identity slots (who it is for, job location,
 * contact, quote date) always render in a stable order so every document has
 * the same shape; the schedule only appears when the work is scheduled.
 */
function renderDocumentSummary(quote: QuoteData, t: DocTokens, opts: { boxed?: boolean } = {}) {
  const scheduled = scheduledLine(quote);
  const contact = clientContactLine(quote);

  const cell = (label: string, value: string) => `
    <div>
      ${eyebrow(label, t.muted)}
      <p style="margin:4px 0 0;color:${t.ink};font-size:14px;font-weight:600;line-height:1.45;">${value || `<span style="color:${t.faint};font-weight:500;">—</span>`}</p>
    </div>
  `;

  const containerStyle = opts.boxed
    ? `background:${t.panel};border:1px solid ${t.border};border-radius:8px;padding:16px;`
    : `padding:16px 0;border-top:1px solid ${t.border};border-bottom:1px solid ${t.border};`;

  return `
    <div class="quote-document-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px 22px;${containerStyle}margin-bottom:24px;">
      ${cell("Prepared for", escapeHtml(quote.client_name))}
      ${cell("Job location", escapeHtml(quote.client_address))}
      ${cell("Client contact", contact)}
      ${cell("Quote date", date(quote.created_at))}
      ${scheduled ? cell("Scheduled", scheduled) : ""}
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

function renderLineItemCopy(description: string, t: DocTokens) {
  const { title, detail } = splitLineItemDescription(description);
  return `
    <div>
      <strong class="quote-line-title" style="display:block;color:${t.ink};font-size:14px;font-weight:600;line-height:1.35;">${escapeHtml(title)}</strong>
      ${detail ? `<span class="quote-line-detail" style="display:block;margin-top:4px;color:${t.muted};font-size:12.5px;line-height:1.5;">${escapeHtml(detail)}</span>` : `<span class="quote-line-detail" style="display:none;"></span>`}
    </div>
  `;
}

/**
 * Mobile-friendly line item rows (never a real <table>, so the PDF stays
 * readable on a phone). A quiet column header sits above the rows on the doc
 * itself; each row also keeps inline Qty / Unit price micro-labels.
 */
function renderLineItems(quote: QuoteData, t: DocTokens, scopeHeading = "Scope of work") {
  const header = `
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(78px,auto) minmax(104px,auto);gap:16px;padding:0 0 8px;border-bottom:1px solid ${t.borderStrong};">
      ${eyebrow(scopeHeading, t.muted)}
      <div style="text-align:right;">${eyebrow("Qty / rate", t.muted)}</div>
      <div style="text-align:right;">${eyebrow("Amount", t.muted)}</div>
    </div>
  `;

  const rows = quote.line_items
    .map(
      item => `
        <div class="quote-line-row" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(78px,auto) minmax(104px,auto);gap:16px;align-items:start;padding:14px 0;border-bottom:1px solid ${t.border};">
          <div style="min-width:0;">
            ${renderLineItemCopy(item.description, t)}
          </div>
          <div class="quote-line-quantity" style="text-align:right;color:${t.muted};font-size:12.5px;line-height:1.5;">
            <span style="display:block;color:${t.ink};font-weight:600;">${item.quantity} ${escapeHtml(item.unit ?? "")}</span>
            <span class="quote-line-unit-price" style="display:block;color:${t.muted};">${money(item.unit_price)} <span style="color:${t.faint};">/ unit</span></span>
          </div>
          <div style="text-align:right;">
            <strong class="quote-line-amount" style="display:block;white-space:nowrap;color:${t.ink};font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;">${money(item.total)}</strong>
          </div>
        </div>`
    )
    .join("");

  return `
    <div class="quote-line-items" style="margin:24px 0;">
      ${header}
      ${rows}
    </div>
  `;
}

/**
 * Total summary. The total is rendered in ink (never a coloured button),
 * large and easy to find, separated by a strong hairline. Accent appears only
 * as the small "Total due" eyebrow.
 */
function renderTotal(quote: QuoteData, t: DocTokens) {
  const row = (label: string, value: string) => `
    <p style="display:flex;justify-content:space-between;gap:24px;margin:7px 0;color:${t.muted};font-size:13px;">
      <span>${label}</span><span style="font-variant-numeric:tabular-nums;">${value}</span>
    </p>
  `;

  return `
    <div style="margin:24px 0 0;display:flex;justify-content:flex-end;">
      <div style="width:100%;max-width:300px;">
        ${row("Subtotal", money(quote.subtotal))}
        ${quote.tax_amount > 0 ? row(`Tax (${(quote.tax_rate * 100).toFixed(1)}%)`, money(quote.tax_amount)) : ""}
        <div style="margin-top:10px;padding-top:12px;border-top:2px solid ${t.ink};">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px;">
            <span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${t.accent};">Total due</span>
            <span style="color:${t.ink};font-size:26px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1;">${money(quote.total)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/** Client note + terms, grouped into named sections. */
function renderNotesAndTerms(quote: QuoteData, business: BusinessSnapshot, t: DocTokens) {
  const note = quote.notes || business.quote_default_note;
  const terms = business.quote_default_terms;
  if (!note && !terms) return "";

  return `
    <div style="margin-top:28px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:24px;">
      ${note ? `
        <div class="quote-document-notes">
          ${eyebrow("Client note", t.accent)}
          <p style="margin:6px 0 0;color:${t.inkSoft};font-size:13px;line-height:1.6;">${multiline(note)}</p>
        </div>` : ""}
      ${terms ? `
        <div class="quote-document-terms">
          ${eyebrow("Terms", t.accent)}
          <p style="margin:6px 0 0;color:${t.muted};font-size:12.5px;line-height:1.55;">${multiline(terms)}</p>
        </div>` : ""}
    </div>
  `;
}

/** Policies & warranty block — what may change the price / coverage. */
function renderPolicy(business: BusinessSnapshot, t: DocTokens) {
  if (!business.quote_policy_text) return "";
  return `
    <div class="quote-document-policies" style="margin-top:20px;padding-top:16px;border-top:1px solid ${t.border};">
      ${eyebrow("Policies & warranty", t.muted)}
      <p style="margin:6px 0 0;color:${t.muted};font-size:12.5px;line-height:1.55;">${multiline(business.quote_policy_text)}</p>
    </div>
  `;
}

/** Footer: who is sending it + how to follow up. */
function renderFooter(business: BusinessSnapshot, t: DocTokens) {
  const bits = [escapeHtml(business.business_name), contactLine(business), escapeHtml(business.license_text)].filter(Boolean);
  return `
    <div style="margin-top:28px;padding-top:14px;border-top:1px solid ${t.border};color:${t.faint};font-size:11.5px;line-height:1.6;">
      <p style="margin:0;">${bits.join("  ·  ")}</p>
      <p style="margin:4px 0 0;">To approve this ${t.docLabel.toLowerCase()}, use the approval link in your email or reply to confirm. Questions are welcome before you approve.</p>
    </div>
  `;
}

/** The page shell — a single white sheet with a hairline frame. */
function shell(t: DocTokens, inner: string, maxWidth = 760) {
  return `
    <div style="font-family:${FONT_STACK};box-sizing:border-box;width:100%;max-width:${maxWidth}px;margin:0 auto;background:${t.bg};color:${t.ink};padding:clamp(22px,5vw,40px);border-radius:10px;border:1px solid ${t.border};overflow-wrap:anywhere;-webkit-font-smoothing:antialiased;">
      ${inner}
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* Direction 1 — Executive Estimate                                    */
/* ------------------------------------------------------------------ */
function renderClassic({ quote, business }: QuoteDocumentInput) {
  const t = themes.classic;

  const inner = `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px 28px;align-items:flex-start;">
      <div>
        ${renderLogo(business, t)}
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:800;line-height:1.15;color:${t.ink};">${escapeHtml(business.business_name)}</h1>
        <p style="margin:0;color:${t.muted};font-size:13px;">${contactLine(business)}</p>
        ${business.license_text ? `<p style="margin:4px 0 0;color:${t.faint};font-size:12px;">${escapeHtml(business.license_text)}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <span style="display:inline-block;padding:5px 12px;border:1px solid ${t.accent};border-radius:6px;color:${t.accent};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">${t.docLabel}</span>
        <p style="margin:14px 0 0;color:${t.ink};font-size:26px;font-weight:800;font-variant-numeric:tabular-nums;">${money(quote.total)}</p>
        <p style="margin:3px 0 0;color:${t.muted};font-size:12.5px;">Dated ${date(quote.created_at)}</p>
      </div>
    </div>

    <div style="height:2px;background:${t.accent};margin:22px 0 24px;border-radius:2px;"></div>

    ${renderDocumentSummary(quote, t)}
    ${renderLineItems(quote, t, "Scope of work")}
    ${renderTotal(quote, t)}
    ${renderNotesAndTerms(quote, business, t)}
    ${renderPolicy(business, t)}
    ${renderFooter(business, t)}
  `;

  return shell(t, inner);
}

/* ------------------------------------------------------------------ */
/* Direction 2 — Contractor Work Order                                 */
/* ------------------------------------------------------------------ */
function renderCompact({ quote, business }: QuoteDocumentInput) {
  const t = themes.compact;

  const inner = `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:14px 24px;align-items:center;padding-bottom:16px;border-bottom:2px solid ${t.ink};">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        ${renderLogo(business, t)}
        <div>
          <h1 style="margin:0;font-size:18px;font-weight:800;line-height:1.2;color:${t.ink};">${escapeHtml(business.business_name)}</h1>
          <p style="margin:3px 0 0;color:${t.muted};font-size:12.5px;">${contactLine(business)}</p>
        </div>
      </div>
      <div style="text-align:right;">
        ${eyebrow(t.docLabel, t.accent)}
        <p style="margin:3px 0 0;color:${t.muted};font-size:12.5px;">${date(quote.created_at)}</p>
      </div>
    </div>

    <div style="margin-top:20px;">
      ${renderDocumentSummary(quote, t, { boxed: true })}
    </div>

    ${renderLineItems(quote, t, "Work to be performed")}

    <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;align-items:start;">
      <div>
        ${renderNotesAndTerms(quote, business, t)}
        ${renderPolicy(business, t)}
      </div>
      <div style="background:${t.panel};border:1px solid ${t.border};border-radius:8px;padding:8px 16px 16px;">
        ${renderTotal(quote, t)}
      </div>
    </div>

    ${renderFooter(business, t)}
  `;

  return shell(t, inner, 740);
}

/* ------------------------------------------------------------------ */
/* Direction 3 — Premium Proposal                                      */
/* ------------------------------------------------------------------ */
function renderModern({ quote, business }: QuoteDocumentInput) {
  const t = themes.modern;

  const inner = `
    <div style="text-align:center;padding-bottom:26px;border-bottom:1px solid ${t.border};">
      <div style="display:flex;justify-content:center;">${renderLogo(business, t)}</div>
      <h1 style="margin:16px 0 0;font-size:24px;font-weight:700;letter-spacing:-.01em;color:${t.ink};">${escapeHtml(business.business_name)}</h1>
      <p style="margin:6px 0 0;color:${t.muted};font-size:13px;">${contactLine(business)}</p>
      <p style="margin:18px 0 0;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:${t.accent};">${t.docLabel}</p>
    </div>

    <div style="text-align:center;margin:30px 0 6px;">
      ${eyebrow("Prepared for", t.muted)}
      <p style="margin:6px 0 0;color:${t.ink};font-size:18px;font-weight:600;">${escapeHtml(quote.client_name)}</p>
      ${quote.client_address ? `<p style="margin:4px 0 0;color:${t.muted};font-size:13px;">${escapeHtml(quote.client_address)}</p>` : ""}
    </div>

    ${renderDocumentSummary(quote, t)}
    ${renderLineItems(quote, t, "Included in this proposal")}
    ${renderTotal(quote, t)}
    ${renderNotesAndTerms(quote, business, t)}
    ${renderPolicy(business, t)}
    ${renderFooter(business, t)}
  `;

  return shell(t, inner, 720);
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

/**
 * Current quote-document renderer version. BUMP this whenever the visual
 * design of the rendered document changes. Sent quotes freeze their version in
 * the business snapshot (see send route), so bumping never re-renders a quote
 * a client has already received — it only affects new/unsent quotes until they
 * are sent. When a future version ships, add a `renderVN` branch below and keep
 * the older `renderV*` functions untouched.
 */
export const QUOTE_RENDERER_VERSION = "v1";

/** v1 — the three locked directions (Executive / Work Order / Premium). */
function renderV1(input: QuoteDocumentInput) {
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

export function renderQuoteDocumentHtml(input: QuoteDocumentInput) {
  // Honor a frozen renderer version stamped onto a sent quote's snapshot;
  // unsent quotes (or pre-versioning snapshots) render the current design.
  const version = input.business.renderer_version ?? QUOTE_RENDERER_VERSION;
  switch (version) {
    case "v1":
    default:
      return renderV1(input);
  }
}
