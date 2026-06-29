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

/**
 * Format an ISO date string as numeric "MM/DD/YYYY" (date only, never a time);
 * empty string when absent. UTC-fixed so the same instant renders identically
 * on the server, in tests, and in the PDF. Used for quote date fields.
 */
export function dateShort(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

/**
 * Build a download filename from the client name + quote date, e.g.
 * "Acme Properties 06-15-2026.pdf". ASCII-sanitized so it is safe inside a
 * Content-Disposition `filename="..."` token (strips quotes/slashes/control
 * chars; the MM/DD/YYYY date uses hyphens since "/" is illegal in filenames).
 */
export function quotePdfFilename(
  clientName: string | null | undefined,
  isoDate: string | null | undefined,
) {
  const safeName =
    String(clientName ?? "")
      .replace(/[^A-Za-z0-9 _.-]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || "Quote";
  const datePart = dateShort(isoDate).replace(/\//g, "-");
  return `${safeName}${datePart ? ` ${datePart}` : ""}.pdf`;
}

/**
 * Format a US phone number consistently as "(123) 456 7890". Strips a leading
 * country code "1" if present. Anything that isn't a 10-digit US number is
 * returned trimmed and unchanged, so international or partial numbers survive.
 */
export function formatPhone(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)} ${ten.slice(6)}`;
}

/** Small uppercase eyebrow label used throughout the documents. */
export function eyebrow(label: string, color: string) {
  return `<span style="display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${color};">${escapeHtml(label)}</span>`;
}
