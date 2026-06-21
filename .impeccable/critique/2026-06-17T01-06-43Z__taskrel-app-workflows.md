---
target: Taskrel app workflows
total_score: 21
p0_count: 0
p1_count: 3
timestamp: 2026-06-17T01-06-43Z
slug: taskrel-app-workflows
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Quote send/save/readiness states are visible, but invoice detail still uses a spinner-only load and several workflows lack clear completion feedback. |
| 2 | Match System / Real World | 3 | Contractor language is mostly natural; terms like AI Assistant, pricing intelligence, Stripe Connect, and Google Sheets sync still need task-language framing. |
| 3 | User Control and Freedom | 2 | Back paths exist, but quote/invoice/settings flows lack consistent cancel, draft recovery, undo, and clear exits from high-stakes actions. |
| 4 | Consistency and Standards | 2 | Quotes use the strongest workflow grammar; invoices, onboarding, billing/settings, and AI use different component patterns and hard-coded surfaces. |
| 5 | Error Prevention | 2 | Some validation and disabled states exist, but contractor-critical actions still rely on after-the-fact errors instead of guidance before sending/syncing/connecting. |
| 6 | Recognition Rather Than Recall | 2 | Nav labels and quote readiness help, but users must learn different workflow structures screen by screen. |
| 7 | Flexibility and Efficiency | 1 | Few accelerators exist: no bulk follow-up, quick filters across workflows, reusable defaults beyond quote settings, or mobile-first action shortcuts. |
| 8 | Aesthetic and Minimalist Design | 2 | Dark theme is calm and readable, but metrics/charts/cards often compete with the next work item. |
| 9 | Error Recovery | 2 | Errors are usually plain language, but recovery steps are inconsistent and sometimes generic. |
| 10 | Help and Documentation | 2 | There are useful inline hints in quote/settings areas, but little contextual help at high-risk moments. |
| **Total** | | **21/40** | **Acceptable: good direction, significant workflow and consistency work still needed.** |

## Anti-Patterns Verdict

Does this look AI-generated? Not instantly, especially after the quote workflow pass. The stronger parts feel like a real operational app: restrained dark surfaces, clear statuses, and obvious next actions.

LLM assessment: The AI-ish tells are structural rather than decorative. Dashboard, invoices, clients, and AI Assistant lean on repeated metric/card/charts patterns. Several screens use tiny uppercase section labels as scaffolding. Quotes now feel like a workflow; other areas still feel like dashboard pages stitched beside it. The `Surface` component also combines a 1px border with a wide soft shadow, which is one of Impeccable's known ghost-card tells.

Deterministic scan: 2 warnings. Both are `overused-font` findings: `src/app/globals.css:49` uses Inter for the app, and `src/lib/quote-document.ts:175` uses Inter in generated quote documents. For Taskrel, this is a low-priority or acceptable product-UI warning; system-like sans typography is allowed in the product register. The detector did not catch the main issues because they are IA and workflow-order problems.

Visual overlays: Not available in this run. The Browser automation surface was not exposed to the parent session, so I cannot claim live Impeccable overlays were injected.

## Overall Impression

Taskrel has a strong product wedge, and the recent quote work is moving in the right direction. The biggest opportunity is to make every screen follow the same operational grammar: what needs attention, what status it is in, what the contractor should do next, and what proof they have after doing it. Right now, quotes are closest to that; invoices, jobs, dashboard, AI, clients, and settings are less mature.

## What's Working

1. The quote workflow now has a concrete mental model: review readiness, delivery state, next action, and a document preview all point at the contractor's real decision.
2. The dark visual foundation fits the physical use case: a contractor checking work between jobs, often on a phone, where eye comfort matters.
3. The product has real operational substance in settings: quote document controls, overhead, billing, exports, and integrations are not fake dashboard filler.

## Priority Issues

### [P1] The app lacks one cross-workflow next-action grammar

Why it matters: Contractors do not open Taskrel to admire analytics. They need to know what to review, send, schedule, collect, or fix. Quotes now do this; dashboard, AI, invoices, jobs, and clients still vary in structure.

Fix: Define a shared workflow pattern: `Status summary -> next action -> work item list -> secondary insight`. Apply it first to dashboard, invoices, jobs, and AI Assistant. Dashboard should lead with Today / Quote follow-up / Money to collect, not generic metrics.

Suggested command: `$impeccable shape Taskrel workflow grammar`

### [P1] Invoice detail is visually and structurally behind the quote detail flow

Why it matters: Quote-to-invoice is the core business promise. The invoice detail screen uses an older narrow mobile layout, hard-coded colors, spinner-only loading, simple line items, and a payment link block that does not match the newer quote command surface.

Fix: Rebuild invoice detail with the same structure as quote detail: header with status and next action, total/payment summary, line items, send/resend action, recovery states, and payment proof. Use shared `Surface`, `Button`, `Badge`, `PageHeader`, and formatting utilities.

Suggested command: `$impeccable polish invoice detail workflow`

### [P1] Mobile decision load is still too high in several workflows

Why it matters: The primary user is distracted and phone-first. On mobile, quote review, pricing intelligence, settings, onboarding, and calendar make the user scan many small panels before the key action is obvious.

Fix: Standardize mobile order: title/status, primary action, active work, then details/analytics/settings. Push optional intelligence and integrations behind compact summaries or disclosure. Keep decision groups to four visible choices or fewer.

Suggested command: `$impeccable adapt mobile workflows`

### [P2] Analytics and AI surfaces duplicate work instead of reducing it

Why it matters: AI Assistant and dashboard both surface next actions, risks, pipeline charts, and schedule opportunities. This creates another place to check instead of making the current workflow smarter.

Fix: Move AI recommendations into the workflows they affect. Keep the AI page only if it becomes a command center for unresolved recommendations; otherwise fold it into dashboard and quote/invoice/job cards.

Suggested command: `$impeccable distill dashboard and AI Assistant`

### [P2] Component drift weakens trust

Why it matters: Taskrel needs to feel dependable. Hard-coded panels in onboarding/invoice detail, repeated section-title styles, varied button radii, and ad hoc colors make the app feel assembled over time rather than designed as one product.

Fix: Consolidate surfaces, controls, section headers, empty states, loading states, and status/action cards. Reduce `tr-card` shadow blur or remove the border-shadow pairing. Replace hard-coded `#F97316`, `#172235`, `#1E293B`, and similar one-offs with tokens.

Suggested command: `$impeccable extract Taskrel product UI system`

## Persona Red Flags

Casey, distracted mobile contractor: Primary actions often sit after a lot of context, especially in quote review, invoice detail, settings, and dashboard. Calendar helps scan dates, but a selected empty day gives no quick scheduling path. Invoice detail is compact, but not reassuring enough for send/payment status.

Jordan, first-timer: Terms like AI Assistant, pricing intelligence, property value verification, Stripe Connect, and Google Sheets sync require translation. Settings puts account, overhead, quote documents, billing, export, sync, and sign out into one dense surface.

Sam, accessibility-dependent user: Status is often reinforced by text, which is good, but some loading states are spinner-only, some custom buttons/links need focus verification, and several small uppercase labels use faint slate text that may struggle in real dark-mode field conditions.

Project-specific persona, solo contractor between jobs: They want Taskrel to answer "what should I do next?" without searching. Quotes mostly do; dashboard and AI split the same intent, invoices do not mirror quote confidence, and clients has records without obvious next actions.

## Minor Observations

- Dashboard starts with four metric tiles before the active quote queue.
- Invoices puts an invoice-status chart and payment-workflow panel before the invoice list.
- Jobs has a useful next-job panel, but the checklist is generic and not connected to real job data.
- Clients is clear but passive: no client detail, no direct call/email action, no recent quote/job context.
- Settings should likely become grouped tabs or separate routes: Account, Quote documents, Payments, Export.
- Onboarding uses hard-coded colors and a standalone shell instead of the shared Taskrel visual system.
- Quote pricing intelligence is useful but too dense for a mobile contractor unless collapsed by default.

## Questions to Consider

- What if dashboard's first viewport were only Today, Quote follow-up, and Money to collect?
- Should AI Assistant exist as a separate destination, or should AI become inline recommendations inside each workflow?
- Should settings be a hub of separate workflows instead of one long page?
- What proof does a contractor need after sending a quote or invoice: sent channel, timestamp, recipient, delivery issue, next follow-up date?

## Implementation Planning Log

Status: implemented on branch; pending PR creation/push.

Branch: `codex/taskrel-workflow-critique`

Primary implementation rule: this critique file is the running ledger for decisions, implementation scope, and verification status.

### Confirmed Direction

1. Dashboard becomes Taskrel's command center.
   - First viewport should prioritize `Today`, `Quote follow-up`, and `Money to collect`.
   - Generic metrics and charts become secondary context, not the opening task.
   - AI should not become a second place the contractor must check.

2. AI Assistant becomes inline intelligence or unresolved notices.
   - Recommendations should live inside the workflow they affect when possible.
   - A separate AI page is only justified if it manages unresolved recommendations from across workflows.
   - Avoid language that makes AI feel like a vague feature destination; use task-language such as notices, recommendations, follow-ups, blockers, or risks.

3. Invoice detail should mirror quote detail's workflow confidence.
   - Header/status/next action must be visible immediately.
   - Payment summary, line items, send/resend action, recovery states, payment link, and payment proof should be first-class.
   - Invoice status must be derived from real inputs where possible: send success, due date, unpaid balance, Stripe/payment proof, and explicit void state.

4. Statuses must be event-backed and compliant.
   - Status labels should not claim certainty unless Taskrel has a real signal.
   - Quote `sent` and invoice `sent` should be backed by delivery proof.
   - Invoice `paid` should be backed by Stripe webhook or recorded full payment.
   - Invoice `overdue` should be derived from due date and unpaid balance.
   - Job `in_progress` can be derived from schedule window or explicit start, but explicit completion/cancel should remain user-controlled.

5. Proof matters because it reduces friction.
   - Contractors should see channel, timestamp, recipient, provider result, delivery issue, and next recovery action after high-stakes sends.
   - Recommended implementation direction: add persistent delivery or workflow events for quote/invoice sends before claiming robust compliance.

6. Delivery proof should use a persistent event table.
   - Decision: add a new `delivery_events` or `workflow_events` table rather than storing event arrays on quotes/invoices.
   - Reason: quote/invoice sends can be attempted repeatedly, can partially succeed by channel, and need an auditable history without mutating old proof.
   - Required fields: contractor id, actor user id, entity type, entity id, action, channel, recipient, provider, status, code, message, metadata, timestamp.
   - UI requirement: show successful proof without claiming failed channels worked, and show failed attempts with a clear recovery action.

7. Quote detail mobile density should use a decision spine.
   - Decision: on mobile, keep status, next action, readiness/send controls, quote total, and editable line items expanded by default.
   - Collapse by default: pricing intelligence, property value check, assumptions/risk notes, and document preview controls.
   - Reason: the primary mobile question is whether the quote can be sent confidently; optional intelligence should support that decision without pushing the action down the page.

8. Calendar empty days should offer scheduling action.
   - Decision: selected days with no jobs should not be passive empty states.
   - If approved unscheduled quotes exist, show `Schedule approved work` and surface the most relevant approved quotes.
   - If no approved unscheduled quotes exist, show `Create quote`.
   - Reason: the calendar should reduce friction between approved work and scheduled work, not merely display dates.

9. Clients should become a lightweight workflow surface.
   - Decision: Clients should not remain only a passive directory.
   - Each client card should show reachability, most recent quote/job/invoice context, direct call/email actions when contact exists, and the next relevant action.
   - Missing email/phone/address should be framed as a workflow blocker because it slows quote and invoice delivery.
   - Reason: contractors open clients to contact, follow up, schedule, or understand history, not to browse a static database.

10. Settings should become a grouped workflow hub.
    - Decision: use grouped tabs or anchors for `Account`, `Quote documents`, `Payments`, and `Export`.
    - Do not split into separate routes yet unless a group becomes too complex after implementation.
    - Each group should lead with status and next action, then reveal details/forms.
    - High-risk actions such as online payment setup, spreadsheet export, disconnect, and sign out need clear outcomes and recovery language.
    - Reason: the current settings page mixes account, document, billing, export, sync, and sign-out work into one scanning burden.

11. Onboarding should stay standalone but use the Taskrel system.
    - Decision: onboarding remains a focused setup flow without the full app shell.
    - Rebuild it with shared Taskrel tokens/components, including `Button`, `Surface`, status/error patterns, and existing color variables.
    - Remove hard-coded orange/slate styling and standalone mini-app feel.
    - Use contractor task language such as `What work do you quote?` and `Which trade should Taskrel default to?`.
    - Reason: onboarding should feel like the beginning of the same product, not a separate prototype.

12. Component drift cleanup should be focused.
    - Decision: include a design-system cleanup pass only for trust-impacting drift.
    - Fix `Surface` ghost-card border/shadow pairing, shared section headers, empty states, skeleton/loading states, status/action cards, and hard-coded colors in touched screens.
    - Do not attempt a full component library rewrite in this critique pass.
    - Reason: consistency should support workflow confidence without delaying the operational fixes.

13. Mobile action shortcuts should be selective.
    - Decision: add near-top or sticky mobile actions only for high-frequency, high-stakes tasks.
    - Required shortcuts: quote send, invoice send/resend, payment-link copy, schedule approved work, and direct client contact.
    - Lower-risk actions can stay inline.
    - Reason: shortcuts should remove field friction without making every screen feel heavy or permanently sticky.

14. Terminology should use contractor task language.
    - Decision: replace product/tech-heavy labels across touched workflows.
    - Use `Taskrel notices` or `Recommendations` instead of `AI Assistant`.
    - Use `Pricing check` instead of `Pricing intelligence`.
    - Use `Property value check` instead of `Property value verification`.
    - Use `Online payments` instead of `Stripe Connect`.
    - Use `Spreadsheet export` instead of `Google Sheets sync`.
    - Use plain chart labels such as `Quote value by stage` instead of `Pipeline intelligence`.
    - Reason: first-timers should understand what task is being supported without learning integration names first.

### Remaining Open Decisions To Grill

1. Completion criteria for this critique.
    - The file should be considered complete only when every agreed item is fully functional in the app, not merely visually represented.
    - All P1/P2 priority issues and listed minor observations must be fixed in code unless explicitly deferred by the user.
    - Functional means the relevant data is fetched, status/proof/next-action logic is derived from real inputs, primary actions work, recovery states are visible, and mobile order supports the task.
    - Before PR: run focused tests, lint, production build, and a mobile-first visual pass on dashboard, quotes, invoices, jobs, clients, calendar, settings, onboarding, and notices.

### Completion Criteria

The critique is complete only when everything agreed above is fully functional in the app.

Required before PR:

1. All P1/P2 priority issues are implemented unless the user explicitly defers them.
2. Minor observations from the critique are implemented when they affect workflow friction or trust.
3. Statuses and proof states are derived from real fields/events rather than static copy.
4. Primary actions work for the workflow they represent.
5. Recovery states are visible for failed sends, missing config, missing contact, empty queues, and unavailable integrations.
6. Mobile order is verified for Dashboard, Quotes, Invoices, Jobs, Clients, Calendar, Settings, Onboarding, and Notices.
7. Focused tests cover status/proof/workflow logic.
8. `pnpm lint` passes.
9. `pnpm build` passes.
10. The branch `codex/taskrel-workflow-critique` is pushed and a PR is created for deployment review.

### Work Already Started On Branch

The branch contains the implementation for:

- Persistent delivery proof events for quote/invoice sends and Stripe payment webhooks.
- Workflow helpers for invoices, jobs, and the dashboard command center.
- Dashboard command center: `Today`, `Quote follow-up`, and `Money to collect`.
- Invoice list/detail workflow with derived payment status, blockers, send proof, payment link, and copy action.
- Quote detail send proof panel and terminology cleanup to `Pricing check`.
- Calendar empty-day scheduling action for approved unscheduled quotes, with fallback to `Create quote`.
- Clients as a lightweight workflow surface with reachability, recent work, direct contact, and next action.
- Settings grouped hub: `Account`, `Quote documents`, `Online payments`, and `Spreadsheet export`.
- Onboarding rebuilt with Taskrel tokens/components while staying standalone.
- AI page converted to `Taskrel notices` / unresolved recommendations.
- Focused component drift cleanup for high-visibility touched surfaces.

### Verification Log

Completed:

1. Focused workflow/proof tests pass: `pnpm exec vitest run src/lib/delivery-events.test.ts src/lib/workflows/invoice-workflow.test.ts src/lib/workflows/job-workflow.test.ts src/lib/workflows/dashboard-command-center.test.ts src/components/quotes/quote-workflow-model.test.ts`
2. Lint passes: `pnpm lint`
3. Production build passes: `pnpm build`
4. Mobile smoke pass with system Chrome at 390px confirms public auth pages render and protected app routes redirect to login without blank pages.

Known build note:

- The existing Serwist/Turbopack warning still appears during `pnpm build`; the build succeeds.

Known verification limit:

- Authenticated visual click-through for Dashboard, Quotes, Invoices, Jobs, Clients, Calendar, Settings, Onboarding, and Notices still needs a logged-in browser session or seeded test auth account. Build/type checks cover those routes, but this session could only verify their unauthenticated redirect path.

Remaining before final handoff:

1. Commit the branch.
2. Push `codex/taskrel-workflow-critique`.
3. Create a pull request or provide the branch/compare URL if local GitHub PR tooling is unavailable.
