/**
 * Best-effort in-memory per-token cooldown for the unauthenticated public
 * quote-PDF route (security review 2026-06-28, MUST-FIX #3). Each PDF render
 * launches Chromium (heavy CPU/memory), and the route is reachable by anyone
 * holding a quote's public token, so rapid repeats are a DoS / cost vector.
 *
 * This caps repeats per token within a single serverless instance. It is NOT
 * durable across instances or cold starts; a durable per-token cooldown
 * (timestamp column) is tracked as a pre-launch blocker in .agentic/debt.md.
 */

const COOLDOWN_MS = 60_000;
const lastHitByToken = new Map<string, number>();

/**
 * Records a hit and returns true when the caller is rate-limited (i.e. the
 * previous hit for this token was within the cooldown window).
 */
export function checkPdfCooldown(token: string, now: number = Date.now()): boolean {
  const last = lastHitByToken.get(token);
  if (last !== undefined && now - last < COOLDOWN_MS) {
    return true;
  }
  lastHitByToken.set(token, now);

  // Bound memory: opportunistically drop entries past their cooldown.
  if (lastHitByToken.size > 5000) {
    for (const [key, ts] of lastHitByToken) {
      if (now - ts > COOLDOWN_MS) lastHitByToken.delete(key);
    }
  }
  return false;
}
