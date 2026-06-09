# Taskrel — Project Status
*Last updated: June 9, 2026*

---

## Build Progress

| Session | Name | Status |
|---------|------|--------|
| 1 | Project setup (Next.js + Supabase + PWA) | ✅ Done |
| 2 | Database schema | ✅ Done |
| 3 | Auth flow (signup, login, onboarding) | ✅ Done |
| 4 | Quote generator (AI + email/SMS delivery) | ✅ Done |
| 5 | Quote history + client auto-population | ✅ Done |
| 6 | Job calendar | ✅ Done |
| 7 | Invoicing + Stripe payment links | ✅ Done |
| 8 | Stripe billing ($19/mo) + Connect | ✅ Done |
| 9 | CSV export | ✅ Done |
| 10 | Landing page (taskrel.com) | ✅ Done |

---

## What Was Built — Full File Map

```
src/
  app/
    (auth)/
      layout.tsx                    auth shell (dark bg)
      login/page.tsx                email/password login
      signup/page.tsx               signup with business name
      callback/route.ts             Supabase email confirmation handler
      check-email/page.tsx          post-signup confirmation screen
    (app)/
      layout.tsx                    app shell — auth guard + bottom nav
      onboarding/page.tsx           trade selection (first login)
      dashboard/page.tsx            recent quotes + upcoming jobs
      quotes/
        page.tsx                    quote list
        new/page.tsx                AI quote generator (3-step: form → generating → review)
        [id]/page.tsx               quote detail + send/resend/convert to invoice
      clients/page.tsx              client list (auto-populated from quotes)
      calendar/page.tsx             monthly calendar with job dots + day view
      invoices/
        page.tsx                    invoice list
        [id]/page.tsx               invoice detail + send
      settings/
        page.tsx                    account info, billing status, CSV download, sign out
        billing/page.tsx            Stripe subscription + Connect setup

    api/
      quotes/route.ts               GET list / POST create
      quotes/[id]/route.ts          GET one / PATCH update
      quotes/generate/route.ts      POST → Claude API → returns line items JSON
      quotes/send/route.ts          POST → SendGrid + Twilio + auto-creates client
      jobs/route.ts                 GET (with date range) / POST create
      invoices/route.ts             GET list / POST create (or convert from quote)
      invoices/[id]/route.ts        GET one / PATCH update
      invoices/[id]/send/route.ts   POST → creates Stripe payment link + sends email/SMS
      stripe/subscribe/route.ts     POST → Stripe Checkout session ($19/mo)
      stripe/connect/route.ts       POST → Stripe Connect onboarding link
      stripe/webhook/route.ts       POST → handles subscription + payment events
      export/csv/route.ts           GET → returns quotes + invoices as CSV download

    manifest.ts                     PWA manifest
    sw.ts                           service worker
    layout.tsx                      root layout (PWA metadata, viewport)
    page.tsx                        public landing page (hero, features, pricing)

  components/
    ui/
      button.tsx                    primary/secondary/ghost/destructive variants
      input.tsx                     labeled input with error state
      badge.tsx                     status badges with auto color mapping
    layout/
      bottom-nav.tsx                5-tab mobile bottom nav (Home/Quotes/Calendar/Invoices/Settings)

  lib/
    supabase/
      client.ts                     browser client
      server.ts                     server client
      middleware.ts                 session refresh helper
    actions/auth.ts                 server actions: login, signup, logout, completeOnboarding
    prompts/quote-prompts.ts        trade-specific Claude system prompts (7 trades)
    stripe.ts                       Stripe client singleton

  middleware.ts (deleted)           replaced by proxy.ts
  proxy.ts                          Next.js 16 route proxy — auth guard

  types/index.ts                    TypeScript types for all entities

supabase/
  migrations/001_initial_schema.sql full DB schema — run in Supabase SQL editor
```

---

## Actions Required From You

### Step 1 — Install dependencies
```powershell
cd C:\Users\DEIVI\Desktop\Taskrel
pnpm install
```
New packages added: `@anthropic-ai/sdk`, `@sendgrid/mail`, `stripe`, `twilio`

### Step 2 — Run the DB migration
1. Go to [supabase.com](https://supabase.com) → your project → SQL Editor
2. Paste contents of `supabase/migrations/001_initial_schema.sql`
3. Click Run

### Step 3 — Create .env.local
Copy `.env.local.example` → `.env.local` and fill in:

| Key | Where to get it |
|-----|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Same (keep secret) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Same |
| `STRIPE_WEBHOOK_SECRET` | After setting up webhook (see below) |
| `STRIPE_PRICE_ID` | Create a $19/mo recurring product in Stripe Dashboard → Products |
| `SENDGRID_API_KEY` | app.sendgrid.com → Settings → API Keys |
| `SENDGRID_FROM_EMAIL` | A verified sender in SendGrid |
| `TWILIO_ACCOUNT_SID` | console.twilio.com |
| `TWILIO_AUTH_TOKEN` | Same |
| `TWILIO_PHONE_NUMBER` | Buy a number in Twilio (required before SMS works) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for dev, your domain for prod |

### Step 4 — Set up Stripe webhook (for subscription + payment events)
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://yourdomain.com/api/stripe/webhook`
3. Events to listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `payment_intent.succeeded`
4. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

For local dev, use Stripe CLI:
```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Step 5 — Run dev server
```powershell
pnpm dev
```

---

## Decisions Made (Sessions 3–10)

- **Server actions for auth** — no client JS needed for login/signup, simpler and more reliable
- **`useActionState`** (React 19) used for form state — no external form library needed
- **Client auto-population is automatic** — when a quote is sent, the client record is created/matched by email or phone. No manual client management.
- **Quote → Invoice conversion marks the quote as "approved"** — keeps status consistent without a separate approval flow
- **Invoice payment links are created on-demand** at send time (not at invoice creation) — avoids creating dead Stripe products for invoices that never get sent
- **Calendar is built from scratch** (no library) — zero dependency, works on any phone, mobile-optimized touch targets
- **CSV export combines quotes + invoices** in one file with section headers — simpler than two separate endpoints
- **Google Sheets sync deferred** — left out of v1 per PRD scope, add in v2
- **Landing page is mobile-first** — hero, 4 feature cards, pricing card, CTA. No desktop breakpoints needed for launch.
- **Stripe API version pinned** to `2025-04-30.basil` — use whatever is current in your Stripe dashboard if this errors

## Open Items / Known Gaps

- `pnpm approve-builds` needs to be run after `pnpm install` for `sharp` and `unrs-resolver`
- PWA icons in `public/icons/` are placeholder navy squares — replace before launch
- No quote editing after generation — user can regenerate, can't edit line items inline (v2)
- No email template customization — hardcoded HTML email in send routes (v2)
- Google Sheets sync not built (v2 per PRD)
- No push notifications (v2 per PRD)
- Stripe webhook needs real domain for production — use Stripe CLI for local testing

## Validation Contractor

**APR Painting (Carlos)** — South Florida. Free access during validation.
Goal: 3 quotes without assistance within 2 weeks.
Becomes case study on landing page at public launch.
