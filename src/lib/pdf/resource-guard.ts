/**
 * SSRF guard for quote-PDF rendering (security review 2026-06-28, MUST-FIX #1).
 *
 * The quote document HTML embeds a contractor-controlled logo URL as an
 * `<img src>`. When Chromium renders that HTML it will try to fetch the image,
 * so a malicious `logo_url` could otherwise reach the local filesystem,
 * localhost, private networks, or cloud-metadata endpoints. We only ever allow
 * Chromium to fetch https images from public hosts.
 *
 * Residual risk: this checks the request HOSTNAME, not the resolved IP, so a
 * public hostname that resolves to a private/metadata IP (DNS rebinding) is not
 * caught here. Tracked as a pre-launch hardening item in .agentic/debt.md.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

/** Returns true when Chromium must NOT be allowed to fetch this resource URL. */
export function isBlockedResourceUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return true;
  }

  // Only plain https sub-resources. Blocks file:, http:, data:, blob:, ftp:, …
  if (url.protocol !== "https:") return true;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost")) return true;

  // Literal IPv4 in loopback / private / link-local (incl. cloud metadata).
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  // A legitimate logo host is never a raw IPv6 literal; block them all
  // (covers ::1, fe80::/10 link-local, fc00::/7 unique-local).
  if (host.includes(":")) return true;

  return false;
}
