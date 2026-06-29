/**
 * SSRF guard for quote-PDF rendering (security review 2026-06-28, MUST-FIX #1).
 *
 * The quote document HTML embeds a contractor-controlled logo URL as an
 * `<img src>`. When Chromium renders that HTML it will try to fetch the image,
 * so a malicious `logo_url` could otherwise reach the local filesystem,
 * localhost, private networks, or cloud-metadata endpoints. We only ever allow
 * Chromium to fetch https images from public hosts.
 *
 * The synchronous isBlockedResourceUrl checks the request scheme + literal
 * host. isBlockedResourceUrlResolved additionally resolves a hostname and
 * rejects it when any resolved address is private/loopback/link-local, which
 * closes the DNS-rebinding gap (a public hostname pointing at a private IP).
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

/** True for a loopback / private / link-local IPv4 (incl. cloud metadata). */
function isBlockedIpv4(a: number, b: number): boolean {
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * Classifies a *resolved* IP literal (IPv4 or IPv6) as one Chromium must not
 * reach. Unlike the literal-host path, public IPv6 is allowed here — a host
 * that resolves to a public v6 CDN address is legitimate.
 */
export function isBlockedIp(ip: string): boolean {
  const addr = ip.trim().toLowerCase();

  const v4 = addr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) return isBlockedIpv4(Number(v4[1]), Number(v4[2]));

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — classify by the embedded IPv4.
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isBlockedIp(mapped[1]);

  if (addr.includes(":")) {
    if (addr === "::1" || addr === "::") return true; // loopback / unspecified
    const head = addr.split(":")[0];
    if (head.startsWith("fc") || head.startsWith("fd")) return true; // fc00::/7 unique-local
    if (/^fe[89ab]/.test(head)) return true; // fe80::/10 link-local
    return false; // public IPv6
  }

  return false;
}

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
  if (v4 && isBlockedIpv4(Number(v4[1]), Number(v4[2]))) return true;

  // A legitimate logo host is never a raw IPv6 literal; block them all
  // (covers ::1, fe80::/10 link-local, fc00::/7 unique-local).
  if (host.includes(":")) return true;

  return false;
}

/**
 * As isBlockedResourceUrl, but also resolves the hostname and blocks the URL
 * when any resolved address is private — closing the DNS-rebinding gap. Fails
 * closed: an unresolvable host (or one with no addresses) is blocked. The DNS
 * resolver is injected so this stays unit-testable without real DNS.
 */
export async function isBlockedResourceUrlResolved(
  rawUrl: string,
  lookup: (hostname: string) => Promise<string[]>,
): Promise<boolean> {
  if (isBlockedResourceUrl(rawUrl)) return true;

  // isBlockedResourceUrl already passed, so the URL parses and is https.
  const host = new URL(rawUrl).hostname.toLowerCase().replace(/^\[|\]$/g, "");

  let addresses: string[];
  try {
    addresses = await lookup(host);
  } catch {
    return true;
  }
  if (addresses.length === 0) return true;
  return addresses.some(isBlockedIp);
}
