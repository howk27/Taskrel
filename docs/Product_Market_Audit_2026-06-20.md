# Taskrel Product-Market Audit

Date: June 20, 2026

## Market Diagnosis

Taskrel should be known as the simplest phone-first quote-to-cash workflow for solo and small trade contractors: create a professional quote, review pricing, send it, follow up, schedule approved work, invoice, and get paid. The app should not lead with AI as the product category. AI is useful as quote drafting and review assistance inside the workflow, but the buyer is paying for faster, more consistent work getting sent and paid.

## Baseline From The Codebase

Taskrel already ships the right core workflow: public landing page, auth, onboarding, dashboard work queue, quote builder, quote detail, branded quote document settings, scheduling/jobs, invoices, Stripe billing and Connect, CSV/Google Sheets export, and an AI next-actions surface.

The strongest shipped surfaces are the quote workflow and quote readiness model. Quotes are organized into review, waiting, approved, and closed buckets; quote detail supports line-item editing, document preview presets, sending/resending, and quote-to-invoice conversion. Settings also contain the trust-building document fields contractors need: logo, business phone, website, license/insured text, terms, policies, warranty language, and default template.

The current market baseline is not yet "sellable public launch." Several surfaces still say closed test, onboarding does not force quote-document identity setup, AI is promoted as a top-level nav item, SMS delivery is not a real client quote link experience, and there is little public proof, support, security, or trial/subscription confidence.

## Competitor Read

- Jobber: full home-service workflow with quotes, scheduling, invoices, payments, reminders, QuickBooks, online booking, app marketplace, templates, and optional line items. Public pricing starts around Core, with larger plans and add-on complexity.
- Housecall Pro: broad field-service suite for home service pros with trial onboarding, payments, dispatch, online booking, estimates, price book, reviews, QuickBooks, and larger-team packaging.
- ServiceTitan and FieldPulse: heavier operational platforms for bigger or more complex teams; useful as contrast, not direct v1 targets.
- Joist and Invoice Simple: lighter mobile estimate/invoice tools. They are closer substitutes for a solo contractor, with simpler pricing and lower complexity.
- Manual substitutes: text messages, spreadsheets, Word/PDF templates, notes apps, and memory-based pricing remain the real competitor for many first users.

## Positioning Opportunity

Own the gap between generic invoice apps and heavy field-service suites:

"Professional contractor quotes, follow-up, invoices, and payments from your phone, without the field-service software bloat."

Taskrel can win if it is faster to trust than Joist/Invoice Simple and dramatically simpler/cheaper than Jobber or Housecall Pro. The credible wedge is not unlimited operations software; it is consistent quote delivery plus visible follow-up and payment flow.

## Completion Goal Line

Taskrel is sellable when a new contractor can self-serve through this path without founder help:

1. Sign up, understand pricing/trial, and activate the workspace.
2. Set business identity, logo, license/insured text, terms, and payment setup before sending the first quote.
3. Create or edit a professional quote from a phone.
4. Send the client a quote by email and SMS with a real view/approval path.
5. See a clear follow-up queue for sent quotes.
6. Convert approved work to invoice and accept payment.
7. Export or sync records.
8. Trust the product through proof, support, billing clarity, privacy/security basics, and polished production branding.

## Recommended Changes

Lead with:

- Phone-first quote-to-cash, not AI.
- $19/month simple pricing, if public launch truly keeps that plan.
- Professional branded quotes with contractor-controlled pricing.
- Follow-up visibility and quote-to-invoice flow.

Support with:

- AI quote draft assistant, saved contractor rates, pricing intelligence, and business snapshotting.
- Google Sheets/CSV export as lightweight recordkeeping.
- Stripe Connect payment collection.

Bury or rename:

- Rename top-level "AI Assistant" to "Next actions" or move it into Dashboard/Quotes.
- Rename "Create New" to "New quote" to match the primary job.
- Remove closed-test copy from public launch surfaces.

Do before public sale:

- Add first-run setup checklist for business identity, quote defaults, delivery channels, and payment setup.
- Replace placeholder PWA icons and closed-test language.
- Add public trust surfaces: real domain email, terms/privacy, support contact, refund/cancel policy, security basics, and at least one validation proof/case study.
- Create real client-facing quote approval/view links instead of SMS text that asks the client to reply for details.
- Add follow-up states/reminders for sent quotes.
- Add launch-grade empty states and sample/demo data for a first session.
- Verify billing, Stripe Connect, SendGrid, Twilio, Google Sheets, and production env behavior end to end.

## Next Experiments

- Activation metric: percentage of new users who complete document settings and send one quote in the first session.
- Validation metric: APR Painting creates three quotes without assistance within two weeks.
- Pricing test: $19/month against a "first 3 quotes free" or "14-day free trial" offer.
- Landing-page test: "Send a professional quote from your phone in minutes" versus "Quotes, schedules, and invoices in one workflow."
- Retention metric: sent quote follow-up, invoice conversion, and second quote created within seven days.

## Sources Checked

- Taskrel codebase and product docs.
- Jobber pricing: https://www.getjobber.com/pricing/
- Jobber quotes: https://www.getjobber.com/features/quotes/
- Housecall Pro pricing: https://www.housecallpro.com/pricing/
- Housecall Pro price book: https://www.housecallpro.com/features/price-book/
- ServiceTitan: https://www.servicetitan.com/
- FieldPulse pricing: https://www.fieldpulse.com/pricing
- Joist: https://www.joist.com/
- Invoice Simple: https://www.invoicesimple.com/
- QuickBooks pricing: https://quickbooks.intuit.com/pricing/
