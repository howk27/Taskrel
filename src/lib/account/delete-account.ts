/**
 * Pure helpers for the self-serve account-deletion flow.
 *
 * The destructive orchestration (storage purge, auth-user delete, Stripe
 * cancel) lives in src/app/api/account/delete/route.ts. Keeping the decision
 * logic here makes the irreversible parts unit-testable without mocking
 * Supabase/Stripe.
 */

export const QUOTE_LOGOS_BUCKET = "quote-logos";

/**
 * The user must type their own email to confirm deletion. Match is trimmed and
 * case-insensitive (emails are case-insensitive in practice), but must be a
 * non-empty exact match — never treat an empty/whitespace input as a match.
 */
export function confirmationMatches(input: unknown, accountEmail: string): boolean {
  if (typeof input !== "string") return false;
  const typed = input.trim().toLowerCase();
  const expected = accountEmail.trim().toLowerCase();
  if (!typed || !expected) return false;
  return typed === expected;
}

/**
 * Collapse stored document paths to a unique, non-empty list suitable for a
 * single Storage `remove()` call. Storage remove is a no-op on an empty list,
 * but we guard anyway so callers can branch on "nothing to remove".
 */
export function dedupeStoragePaths(paths: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const path of paths) {
    const trimmed = path?.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}
