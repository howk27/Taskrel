import type { BusinessSnapshot, Contractor, Quote, QuoteTemplatePreset } from "@/types";
import { dateShort, escapeHtml, eyebrow, formatPhone, money, multiline } from "./document-format";

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
  // Direction 1 — Standard: polished, structured business document.
  // All three directions print the same client-facing label ("Quote") — they
  // are one document type in different styles, never different document genres.
  classic: {
    ...NEUTRAL,
    docLabel: "Quote",
    accent: "#1E3A5F",
    accentSoft: "#EEF2F7",
  },
  // Direction 3 — Refined: whitespace-led, restrained.
  modern: {
    ...NEUTRAL,
    docLabel: "Quote",
    accent: "#6B5B4A",
    accentSoft: "#F4F1EC",
    bg: "#FFFFFF",
    panel: "#FAFAF8",
  },
  // Direction 2 — Compact: practical, field-service, lightly boxed.
  compact: {
    ...NEUTRAL,
    docLabel: "Quote",
    accent: "#3F4854",
    accentSoft: "#F1F3F5",
  },
};

function contactLine(business: BusinessSnapshot) {
  return [formatPhone(business.business_phone), business.business_website]
    .filter(Boolean)
    .map(escapeHtml)
    .join("  ·  ");
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

/**
 * Fixed client / project block. Identity slots (who it is for, job location,
 * contact, quote date) always render in a stable order so every document has
 * the same shape; the schedule only appears when the work is scheduled.
 */
function renderDocumentSummary(
  quote: QuoteData,
  t: DocTokens,
  opts: { boxed?: boolean; skipClientCells?: boolean } = {},
) {
  const startDate = dateShort(quote.scheduled_start);

  const cell = (label: string, value: string, span = false) => `
    <div${span ? ' style="grid-column:1/-1;"' : ""}>
      ${eyebrow(label, t.muted)}
      <p style="margin:4px 0 0;color:${t.ink};font-size:14px;font-weight:600;line-height:1.45;">${value || `<span style="color:${t.faint};font-weight:500;">—</span>`}</p>
    </div>
  `;

  // Client contact spans the full row so a long email renders on one line; the
  // phone follows on its own line in the shared "(123) 456 7890" format.
  const email = quote.client_email ? escapeHtml(quote.client_email) : "";
  const phone = quote.client_phone ? escapeHtml(formatPhone(quote.client_phone)) : "";
  const contactValue = [
    email ? `<span style="white-space:nowrap;">${email}</span>` : "",
    phone ? `<span style="display:block;margin-top:2px;color:${t.muted};font-weight:500;font-variant-numeric:tabular-nums;">${phone}</span>` : "",
  ].filter(Boolean).join("");

  const containerStyle = opts.boxed
    ? `background:${t.panel};border:1px solid ${t.border};border-radius:8px;padding:16px;`
    : `padding:14px 0;border-top:1px solid ${t.border};border-bottom:1px solid ${t.border};`;

  // The premium direction shows the client + job location in a centered hero,
  // so the summary omits those cells to avoid repeating them.
  const clientCells = opts.skipClientCells
    ? ""
    : `${cell("Prepared for", escapeHtml(quote.client_name))}${cell("Job location", escapeHtml(quote.client_address))}`;

  return `
    <div class="quote-document-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px 22px;${containerStyle}margin-bottom:18px;">
      ${clientCells}
      ${cell("Client contact", contactValue, true)}
      ${cell("Quote Date", dateShort(quote.created_at))}
      ${startDate ? cell("Start Date", startDate) : ""}
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
        <div class="quote-line-row" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(78px,auto) minmax(104px,auto);gap:16px;align-items:start;padding:11px 0;border-bottom:1px solid ${t.border};">
          <div style="min-width:0;">
            ${renderLineItemCopy(item.description, t)}
          </div>
          <div class="quote-line-quantity" style="text-align:right;color:${t.muted};font-size:12.5px;line-height:1.5;font-variant-numeric:tabular-nums;">
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
    <div class="quote-line-items" style="margin:18px 0;">
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
    <div style="margin:18px 0 0;display:flex;justify-content:flex-end;">
      <div style="width:100%;max-width:300px;">
        ${row("Subtotal", money(quote.subtotal))}
        ${quote.tax_amount > 0 ? row(`Tax (${(quote.tax_rate * 100).toFixed(1)}%)`, money(quote.tax_amount)) : ""}
        <div style="margin-top:10px;padding-top:12px;border-top:2px solid ${t.ink};">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px;">
            <span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${t.accent};">Total due</span>
            <span style="color:${t.ink};font-size:26px;font-weight:800;letter-spacing:-.01em;font-variant-numeric:tabular-nums;line-height:1;">${money(quote.total)}</span>
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
    <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px;">
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
    <div style="margin-top:18px;padding-top:12px;border-top:1px solid ${t.border};color:${t.faint};font-size:11.5px;line-height:1.6;text-align:center;">
      <p style="margin:0;">${bits.join("  ·  ")}</p>
      <p style="margin:4px 0 0;">To approve this ${t.docLabel.toLowerCase()}, use the approval link in your email or reply to confirm. Questions are welcome before you approve.</p>
    </div>
  `;
}

/**
 * Two-column close: notes / terms / policy on the left, the total on the
 * right. Reclaims the whitespace a right-aligned total leaves beside it so a
 * typical quote stays on one page. Collapses to a single column on mobile.
 */
function renderClose(quote: QuoteData, business: BusinessSnapshot, t: DocTokens) {
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;align-items:start;">
      <div>
        ${renderNotesAndTerms(quote, business, t)}
        ${renderPolicy(business, t)}
      </div>
      <div>${renderTotal(quote, t)}</div>
    </div>
  `;
}

/** The page shell — a single white sheet with a hairline frame. */
function shell(t: DocTokens, inner: string, maxWidth = 760) {
  return `
    <div style="font-family:${FONT_STACK};box-sizing:border-box;width:100%;max-width:${maxWidth}px;margin:0 auto;background:${t.bg};color:${t.ink};padding:clamp(18px,4vw,30px);border-radius:10px;border:1px solid ${t.border};overflow-wrap:anywhere;-webkit-font-smoothing:antialiased;font-kerning:normal;text-rendering:optimizeLegibility;">
      ${inner}
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* Direction 1 — Standard (formal, structured)                         */
/* ------------------------------------------------------------------ */
function renderClassic({ quote, business }: QuoteDocumentInput) {
  const t = themes.classic;

  const inner = `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:18px 28px;align-items:flex-start;">
      <div>
        ${renderLogo(business, t)}
        <h1 style="margin:12px 0 4px;font-size:22px;font-weight:700;letter-spacing:-.01em;line-height:1.15;text-wrap:balance;color:${t.ink};">${escapeHtml(business.business_name)}</h1>
        <p style="margin:0;color:${t.muted};font-size:13px;">${contactLine(business)}</p>
        ${business.license_text ? `<p style="margin:4px 0 0;color:${t.faint};font-size:12px;">${escapeHtml(business.license_text)}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <span style="display:inline-block;padding:5px 12px;border:1px solid ${t.accent};border-radius:6px;color:${t.accent};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">${t.docLabel}</span>
        <p style="margin:14px 0 0;color:${t.ink};font-size:26px;font-weight:800;letter-spacing:-.01em;font-variant-numeric:tabular-nums;">${money(quote.total)}</p>
      </div>
    </div>

    <div style="height:2px;background:${t.accent};margin:22px 0 24px;border-radius:2px;"></div>

    ${renderDocumentSummary(quote, t)}
    ${renderLineItems(quote, t, "Scope of work")}
    ${renderClose(quote, business, t)}
    ${renderFooter(business, t)}
  `;

  return shell(t, inner);
}

/* ------------------------------------------------------------------ */
/* Direction 2 — Compact (practical, field-service)                    */
/* ------------------------------------------------------------------ */
function renderCompact({ quote, business }: QuoteDocumentInput) {
  const t = themes.compact;

  const inner = `
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:14px 24px;align-items:center;padding-bottom:16px;border-bottom:2px solid ${t.ink};">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        ${renderLogo(business, t)}
        <div>
          <h1 style="margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em;line-height:1.2;text-wrap:balance;color:${t.ink};">${escapeHtml(business.business_name)}</h1>
          <p style="margin:3px 0 0;color:${t.muted};font-size:12.5px;">${contactLine(business)}</p>
        </div>
      </div>
      <div style="text-align:right;">
        ${eyebrow(t.docLabel, t.accent)}
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
/* Direction 3 — Refined (whitespace-led, restrained)                  */
/* ------------------------------------------------------------------ */
function renderModern({ quote, business }: QuoteDocumentInput) {
  const t = themes.modern;

  const inner = `
    <div style="text-align:center;padding-bottom:20px;border-bottom:1px solid ${t.border};">
      <div style="display:flex;justify-content:center;">${renderLogo(business, t)}</div>
      <h1 style="margin:14px 0 0;font-size:24px;font-weight:700;letter-spacing:-.01em;text-wrap:balance;color:${t.ink};">${escapeHtml(business.business_name)}</h1>
      <p style="margin:6px 0 0;color:${t.muted};font-size:13px;">${contactLine(business)}</p>
      <p style="margin:14px 0 0;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:${t.accent};">${t.docLabel}</p>
    </div>

    <div style="text-align:center;margin:20px 0 4px;">
      ${eyebrow("Prepared for", t.muted)}
      <p style="margin:6px 0 0;color:${t.ink};font-size:18px;font-weight:600;">${escapeHtml(quote.client_name)}</p>
      ${quote.client_address ? `<p style="margin:4px 0 0;color:${t.muted};font-size:13px;">${escapeHtml(quote.client_address)}</p>` : ""}
    </div>

    ${renderDocumentSummary(quote, t, { skipClientCells: true })}
    ${renderLineItems(quote, t, "Included in this quote")}
    ${renderClose(quote, business, t)}
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

/** v1 — the three locked directions (Standard / Compact / Refined). */
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
