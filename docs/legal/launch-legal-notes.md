# Taskrel v1 — launch legal notes

> **These are founder-drafted, plain-language templates — not legal advice.**
> Have a licensed attorney review the Privacy Policy and Terms before public
> launch, especially now that Taskrel stores client PII in generated PDFs.

## What changed and why

Taskrel now persists rendered quote/invoice PDFs to a private Storage bucket at
send time (commits #2/#3). Those PDFs contain **client personal information**
(name, address, contact, line items). Storing third-party PII triggers privacy
disclosure obligations and a need for a deletion path.

## Disclosures now live in the product

- **`/privacy`** (`src/app/privacy/page.tsx`)
  - New "Stored documents" section: discloses PDF storage, the PII they contain,
    private/access-controlled bucket, signed-link retrieval.
  - New "Deleting your data" section: self-serve deletion from Settings; what it
    removes; irreversible; Stripe retains billing records per its own rules.
  - Corrected provider list: SMS/Twilio noted as **not active** in v1.
- **`/terms`** (`src/app/terms/page.tsx`)
  - New "Your data and deletion" clause: storage of records + PDFs, self-serve
    deletion, and the contractor's responsibility for a lawful basis to store
    their clients' data.

## Data-deletion path

Self-serve account deletion shipped in v1 (Settings → Danger zone):
- Removes all stored quote/invoice PDFs and logo objects from Storage.
- Deletes the Supabase auth user, which cascades **all** DB records (contractor
  + clients, quotes, invoices, jobs, pricing, documents) via existing
  `ON DELETE CASCADE` foreign keys.
- Best-effort cancels any active Stripe subscription so a deleted account is not
  billed.
- See `src/app/api/account/delete/route.ts`.

## Regime applicability

| Regime | Applies? | Why |
| --- | --- | --- |
| **TCPA** (SMS/calls) | Deferred | SMS is built but OFF in v1. See `tcpa-readiness.md`. |
| **CAN-SPAM** (commercial email) | N/A | Sends are transactional (quote/invoice delivery). |
| **DNC** (telemarketing calls) | N/A | Taskrel makes no calls. |
| **Privacy disclosure + deletion** | **Yes** | We store client PII in PDFs. Addressed above. |

## Open items for counsel

- Confirm the controller/processor framing (the contractor is the data
  controller for their clients' data; Taskrel is the processor).
- Confirm retention/erasure language meets any state privacy laws relevant to
  the contractor base (e.g. CCPA/CPRA for California).
- Confirm consent capture wording before SMS is enabled (see `tcpa-readiness.md`).
