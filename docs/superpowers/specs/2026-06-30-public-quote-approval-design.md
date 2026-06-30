# Public Quote Approval Flow — Design Spec
Date: 2026-06-30

## Overview

Complete the public quote approval flow end-to-end. The `/q/[token]` page, approve
API route, and PDF route already exist. This spec closes three gaps: contractor
notification on approval, quote expiry enforcement on the public page, and improved
approval/expired visibility on the contractor's quote detail page.

---

## Section 1 — Approve API route (`/api/public/quotes/[token]/approve`)

**What changes:** After a successful `status=approved` update, fire a best-effort
contractor notification email via SendGrid.

**Data needed:** Fetch `contractor_id` from the quote row, then join
`contractors.email` and `contractors.business_name` in the same query (or a
second query). Also fetch `quote.client_name` and `quote.id` for the email body
and the deep link.

**Email:**
- To: contractor email
- Subject: `Quote approved by [client_name]`
- Body: minimal inline HTML (dark blue shell matching existing quote email),
  one sentence + a "View quote" CTA linking to `/quotes/[id]` on the app domain.
- Best-effort: wrapped in try/catch; a SendGrid failure logs an error and does
  NOT block the redirect or the approval record.

**App domain:** read from `process.env.NEXT_PUBLIC_APP_URL` (already used by
`buildPublicQuoteUrl`).

---

## Section 2 — Public approval page (`/q/[token]`)

**New field:** Add `valid_until` to the Supabase select. Derive server-side:
```
isExpired = valid_until !== null && new Date() > new Date(valid_until)
```

**Three CTA states:**

1. **Approved** — existing green banner, unchanged.
2. **Expired** — amber line: `"Quote expired [date]."` + "Request resend" button.
3. **Open** — existing Approve + Download PDF buttons, unchanged.

**"Request resend" button:**
- POSTs to `/api/public/quotes/[token]/request-resend` (new route).
- Route: looks up quote by token (admin client), checks `last_resend_requested_at`;
  if within 1 hour, returns 429 and redirects back with `?resend_throttled=1`.
  Otherwise: updates `last_resend_requested_at = now()`, sends a one-liner
  notification email to the contractor ("Your client [client_name] is requesting
  a new quote for [job/address]"), redirects to `/q/[token]?resend_requested=1`.
- Rate-limit column: `last_resend_requested_at timestamptz` on `quotes` table
  (new migration).
- Public page shows confirmation line when `?resend_requested=1`: "Resend
  requested. The contractor will be in touch."
- Public page shows throttle line when `?resend_throttled=1`: "Request already
  sent. Please wait before requesting again."

---

## Section 3 — Contractor quote detail page

**Approval notice:**
- Condition: `quote.status === "approved"`
- Location: action area, above the "Create Invoice" button
- UI: green banner — `"Approved by [client_name] on [approved_at date]."`

**Expired state:**
- Condition: `quote.status === "sent"` and `valid_until` is in the past
- Status badge: render as "Expired" (amber) instead of "Sent"
- Delivery panel: Send/Resend button label becomes "Resend"; calls existing
  `/api/quotes/send` with no special flag — the server derives expiry itself.
- Send route change: after fetching the quote, if `valid_until` is in the past,
  skip `evaluateSendCooldown` entirely. No client flag needed.
- On resend: reset `valid_until = today + 30 days` as part of the
  pre-send quote update (alongside the existing `public_access_token` upsert).

---

## Data changes

| Change | Detail |
|---|---|
| `quotes.last_resend_requested_at` | New `timestamptz` column (nullable). Migration required. |
| `valid_until` in public page select | Add field to existing query — no schema change. |

---

## New files

| File | Purpose |
|---|---|
| `src/app/api/public/quotes/[token]/request-resend/route.ts` | Rate-limited resend request from client |

## Modified files

| File | Change |
|---|---|
| `src/app/api/public/quotes/[token]/approve/route.ts` | Add contractor notification email |
| `src/app/q/[token]/page.tsx` | Add `valid_until`, expired state, resend CTA, confirmation messages |
| `src/app/api/quotes/send/route.ts` | Skip cooldown when quote is expired; reset `valid_until` on resend |
| `src/app/(app)/quotes/[id]/page.tsx` | Approval banner with `approved_at`; expired badge + Resend button |
| `supabase/migrations/` | Migration for `last_resend_requested_at` column |

---

## Error handling

- Contractor notification email failure: log, never block approval or redirect.
- Resend request throttle: 1 per hour per token; show confirmation, not error.
- Expired check on send route: server re-derives from `valid_until`; no client flag involved.

---

## Out of scope

- Decline button for clients (v2)
- Email template customization (existing debt item)
- Push notifications (deferred per roadmap)
