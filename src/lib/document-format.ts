/**
 * Pure presentation formatters shared by the quote and invoice document
 * renderers. These produce HTML-safe strings and currency/date formatting; they
 * hold no document-specific layout. Keeping them here lets both renderers escape
 * client-supplied input identically. No behavior change from the originals that
 * lived privately in quote-document.ts.
 */

/** HTML-escape a string for safe interpolation into a document fragment. */
export function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Escape then convert newlines to <br /> for multi-line note/terms copy. */
export function multiline(value: string | null | undefined) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

/** Format a number as USD currency. */
export function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

/** Format an ISO date string as "Mon D, YYYY"; empty string when absent. */
export function date(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

/** Small uppercase eyebrow label used throughout the documents. */
export function eyebrow(label: string, color: string) {
  return `<span style="display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${color};">${escapeHtml(label)}</span>`;
}
