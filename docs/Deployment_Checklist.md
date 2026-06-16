 Taskrel has been deployed and it's currently reachable at taskrel.com

# Taskrel Closed Test Deployment Checklist

## Vercel Environment Variables

Set these in Vercel under `Project Settings -> Environment Variables`. Use Production, Preview, and Development only if you intentionally want the same value across all scopes.

| Variable | Closed test status | Vercel production value |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Required | `https://your-vercel-domain.com` or `https://taskrel.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | Supabase anon public key |
| `OPENAI_API_KEY` | Required | OpenAI API key |
| `TASKREL_AI_DEFAULT_MODEL` | Recommended | `gpt-5.4-mini` or another Responses API text model enabled for your OpenAI project |
| `TASKREL_AI_COMPLEX_MODEL` | Recommended | `gpt-5.5` or another enabled model for future complex assistant work |
| `TASKREL_PREMIUM_ACCESS_CODES` | Optional for closed test | Comma-separated invite codes that unlock premium as `trialing` |
| `RENTCAST_API_KEY` | Optional | Enables property value verification in quote pricing intelligence |
| `SENDGRID_API_KEY` | Required for email test | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Required for email test | Verified sender on your SendGrid domain |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional today | Supabase service role key, only if future admin routes need it |
| `TWILIO_ACCOUNT_SID` | Optional | Leave unset until SMS is ready |
| `TWILIO_AUTH_TOKEN` | Optional | Leave unset until SMS is ready |
| `TWILIO_PHONE_NUMBER` | Optional | Leave unset until SMS is ready |
| `STRIPE_SECRET_KEY` | Optional for closed test | Required for billing/payment links |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional for closed test | Required for billing/payment links |
| `STRIPE_WEBHOOK_SECRET` | Optional for closed test | Required for Stripe webhooks |
| `STRIPE_PRICE_ID` | Optional for closed test | Required for subscription checkout |
| `GOOGLE_CLIENT_ID` | Optional | Required for Google Sheets sync |
| `GOOGLE_CLIENT_SECRET` | Optional | Required for Google Sheets sync |
| `SERWIST_SUPPRESS_TURBOPACK_WARNING` | Optional | `1` |

## Supabase Setup

- Apply migrations through `007_pricing_intelligence.sql`.
- Confirm `pricing_catalog_items` exists.
- Confirm `contractors.quote_policy_text` exists.
- Confirm `contractors.overhead_percent` and `contractors.overhead_fixed_per_job` exist.
- Confirm `quotes.property_valuation_snapshot` and `quotes.pricing_recommendation_snapshot` exist.
- Confirm Storage bucket `quote-logos` exists and is public.
- In Supabase Auth URL configuration, set:
  - Site URL: production app URL.
  - Redirect URL: `https://your-vercel-domain.com/auth/callback`.

## SendGrid Setup

- Verify the sending domain in SendGrid.
- Set `SENDGRID_FROM_EMAIL` to an address on that verified domain.
- Send one quote to your own external email before inviting a tester.

## Optional Features To Defer

These should not block the first friend-business-owner test:

- SMS via Twilio.
- Stripe subscription checkout.
- Stripe Connect client payments.
- Google Sheets sync.

## Closed-Test Premium Access

- Set `TASKREL_PREMIUM_ACCESS_CODES` in Vercel to one or more comma-separated codes, for example `friend-test-2026,owner-demo`.
- Give one code to each tester or use a shared short-term code during early testing.
- Testers redeem the code in `Settings -> Billing & Payments -> Closed-test premium access`.
- Redeeming a code sets `contractors.subscription_status` to `trialing`; Stripe webhooks can still set the same account to `active`, `past_due`, or `canceled` later.

## AI Quote Generation Troubleshooting

- If quote generation fails in production, check the message shown in the quote builder first. Taskrel now distinguishes rejected API keys, unavailable models, rate limits/quota, empty AI output, and unreadable AI output.
- Confirm `OPENAI_API_KEY` is set in Vercel for the Production environment and redeploy after changing it.
- Confirm `TASKREL_AI_DEFAULT_MODEL` is enabled for the same OpenAI project as the API key. The default is `gpt-5.4-mini`.
- Check Vercel function logs for `/api/quotes/generate` if the UI still reports a generic failure.

## Closed Test Smoke Path

1. Sign up with a fresh email.
2. Complete onboarding with business type, multiple trades, and primary trade.
3. Add quote logo and default policies/warranty language in Settings.
4. Generate a quote.
5. Edit at least one unit price and save.
6. Preview Classic, Modern, and Compact templates.
7. Send quote by email.
8. Confirm the email arrives and the quote looks correct.
9. Convert quote to invoice.
10. Confirm dashboard, quotes, calendar, and invoices still load on mobile width.
