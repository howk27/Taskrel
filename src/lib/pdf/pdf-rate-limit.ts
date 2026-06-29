/**
 * Durable per-quote cooldown for the unauthenticated public quote-PDF route
 * (security review 2026-06-28, MUST-FIX #3 + pre-launch durability follow-up).
 *
 * Each PDF render launches Chromium (heavy CPU/memory) and the route is
 * reachable by anyone holding a quote's public token, so rapid repeats are a
 * DoS / cost vector. The cooldown is backed by quotes.last_pdf_generated_at
 * (migration 012), so — unlike the previous in-memory Map — it holds across
 * serverless instances and cold starts.
 *
 * This module is the pure decision; the route reads/writes the timestamp via
 * the admin Supabase client. A benign race remains (two requests reading the
 * same stale timestamp before either writes); the worst case is a couple of
 * extra renders, acceptable at launch scale.
 */

const COOLDOWN_MINUTES = 1;
export const PDF_COOLDOWN_MS = COOLDOWN_MINUTES * 60_000;

/**
 * Returns true when a render must be refused because the last render for this
 * quote was within the cooldown window. Fails open on a missing or unparseable
 * timestamp and ignores future timestamps (clock skew), so a bad value can
 * never permanently trap a token.
 */
export function isPdfOnCooldown(
  lastGeneratedAt: string | null | undefined,
  now: number = Date.now(),
  cooldownMs: number = PDF_COOLDOWN_MS,
): boolean {
  if (!lastGeneratedAt) return false;
  const last = Date.parse(lastGeneratedAt);
  if (Number.isNaN(last)) return false;
  const elapsed = now - last;
  return elapsed >= 0 && elapsed < cooldownMs;
}
