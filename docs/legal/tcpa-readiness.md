# TCPA Readiness — required before enabling SMS

**Status:** SMS is **OFF for v1.** The Twilio send path is fully built but gated
behind `SMS_ENABLED` in `src/lib/feature-flags.ts`. Do **not** flip that flag on
until every item below is satisfied.

> This is an internal engineering/compliance checklist, not legal advice. Have a
> licensed attorney review the SMS program before launch.

## Why this gate exists

Taskrel sends transactional messages (quote + invoice delivery) on a
contractor's behalf to **the contractor's clients**. Even transactional SMS is
governed by the **Telephone Consumer Protection Act (TCPA)** and carrier rules
(A2P 10DLC registration). Sending without the right consent and opt-out handling
exposes Taskrel and its contractors to statutory damages ($500–$1,500 per
message) and carrier blocking.

CAN-SPAM and DNC are **not** the controlling regimes here:
- **CAN-SPAM** governs commercial *email*, and our sends are transactional. N/A.
- **DNC** (Do-Not-Call) governs telemarketing *calls*. Taskrel makes no calls. N/A.

## Checklist before `SMS_ENABLED = true`

1. **Provision a Twilio number** and set `TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in the production environment.
2. **A2P 10DLC registration** — register the brand and a transactional campaign
   with The Campaign Registry via Twilio. Unregistered traffic is filtered.
3. **Prior express consent** — the contractor must confirm they have the
   client's consent to be texted at the number on the quote/invoice. Capture
   this explicitly (e.g. a checkbox at the point a phone number is entered) and
   store the consent timestamp + source.
4. **Opt-out handling** — honor STOP/UNSUBSCRIBE and confirm with a final
   message. Suppress any number that has opted out; never re-text it.
5. **Sender identification** — every message must identify the business sending
   it (the contractor's `business_name` is already in the template copy).
6. **Quiet hours** — do not send before 8am or after 9pm in the *recipient's*
   local time zone.
7. **Help keyword** — respond to HELP with contact info and opt-out instructions.
8. **Record retention** — keep consent and opt-out records for the carrier- and
   statute-required window.

## Flipping it on

When the above is done: set `SMS_ENABLED = true`, re-expose the SMS channel in
the send UI, and update `/privacy` to disclose SMS delivery + the consent basis.
The send code in `src/app/api/quotes/send/route.ts` and
`src/app/api/invoices/[id]/send/route.ts` already no-ops cleanly when Twilio env
is missing, so the only code change required is the flag.
