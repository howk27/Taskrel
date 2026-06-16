# Taskrel Quotes Workflow Redesign

## Goal

Redesign the quote workflow so contractors can quickly understand what needs attention, edit or review a quote, send it with confidence, and move approved work toward invoicing. The experience should stay dark for eye comfort, but use clearer contrast, surfaces, and workflow structure so it does not feel like one indistinct dark board.

## Product Context

Taskrel is a phone-first operational tool for small contractors. Quote work is the core wedge, so the UI must make quote state and next action obvious. The primary success case is a contractor using a mobile screen to generate, review, revise, send, follow up, and convert a quote without wondering whether the quote is ready or already submitted.

## Recommended Approach

Use a workflow command center for `/quotes`, then align `/quotes/new` and `/quotes/[id]` around the same review/send model.

The quotes list should stop leading with charts as the dominant element. It should lead with actionable work buckets and compact pipeline summaries. The quote detail page should become a review workspace with a clear readiness checklist, editable line items, client-facing preview, and a sticky action area. The new quote review step should reuse the same visual vocabulary so "review before send" feels consistent everywhere.

## Scope

In scope:

- Quotes list at `src/components/quotes/quotes-workflow.tsx`.
- Quote detail page at `src/app/(app)/quotes/[id]/page.tsx`.
- New quote review step at `src/app/(app)/quotes/new/page.tsx`.
- Small shared helpers/components if they remove duplication between quote cards and detail review states.
- Visual refinements to existing UI primitives only when needed for contrast or consistency.

Out of scope:

- Backend status changes beyond existing quote statuses.
- New quote template rendering logic.
- Full CRM, automated follow-ups, or client portal features.
- Replacing dark mode with a light theme.

## Information Architecture

Quotes should be organized by work state, not just database status.

- Needs review: draft quotes that need line-item or client review before sending.
- Waiting on client: sent quotes that may need follow-up or resend.
- Approved work: approved quotes ready to convert to invoice or schedule.
- Closed: rejected or expired quotes that can be duplicated or archived.

Each state needs a visible count and value total where useful, but the action label matters more than the metric. A contractor should see "Review & send," "Follow up," or "Create invoice" before seeing secondary analytics.

## Quotes List Design

The top of `/quotes` should become an operational queue:

- Header: "Quotes" with a primary "New quote" action.
- Summary strip: compact state cards for Needs review, Waiting, Approved, Closed.
- Work tabs: same states as the summary strip, with counts.
- Search: client, address, status.
- Quote cards: client, address, status, amount, last activity, delivery state, readiness cues, and primary next action.

Charts can remain, but they should move below the active queue or collapse into a secondary "Pipeline insight" section. They should not be the first thing a contractor has to parse when trying to work.

On desktop, the right-side selected quote panel can stay, but it should show a workflow summary rather than a generic selected item. It should include status, next action, delivery readiness, and the primary button.

On mobile, cards must be scan-first: client and amount at the top, status and next action immediately visible, contact/delivery details lower.

## Quote Detail Design

The quote detail page should read as a review workspace.

Primary regions:

- Workflow header: client, status, total, dirty/saved indicator, and current next action.
- Readiness checklist: client contact, line items, totals, terms/note, preview, send channel.
- Editable line items: keep the existing mobile expandable edit pattern, but label manual edits and saved rates more clearly.
- Review preview: client-facing document preview remains white/paper-like inside the dark workspace because it represents what the client sees.
- Action panel: save changes, send/resend, approve/convert, and clear error/success messaging.

The page should distinguish "editing internal quote math" from "sending the client document." Dirty changes must be obvious before send/convert actions. If a quote has unsaved edits, the primary action should push saving first or make the save requirement explicit.

## New Quote Review Design

The new quote flow can keep form, generating, and review steps, but the review step should match quote detail:

- Show a generated-quote readiness checklist.
- Label AI estimates, saved rates, and manual edits consistently.
- Keep assistant notes/risk flags secondary to the editable quote content.
- Present "Save draft" and "Send quote" with explicit channel readiness.
- Make any send failure say whether the quote was saved, not just that sending failed.

## Component Model

Create small shared pieces only if they make the workflow clearer:

- `QuoteStateSummary`: state name, count, total, and action-oriented label.
- `QuoteNextAction`: maps status and readiness to a short action label.
- `QuoteReadinessList`: checklist for client contact, line items, terms/notes, preview, send channel.
- `QuoteDeliveryStatus`: not sent, email, SMS, email + SMS, or missing contact.

Keep these components presentational unless a shared helper genuinely reduces duplicated status/readiness logic. Existing `Badge`, `Button`, and `Surface` should remain the base vocabulary.

## Data Flow

Use the existing quote fields:

- `status` determines the workflow bucket.
- `sent_via`, `client_email`, and `client_phone` determine delivery readiness.
- `line_items`, `subtotal`, `tax_amount`, and `total` determine quote completeness.
- `updated_at`, `created_at`, and `scheduled_start` provide activity and date context.
- Existing dirty state on quote detail guards unsaved pricing edits.

No new persistence is required for this redesign.

## Error And Empty States

Empty quotes list:

- Explain the first action in operational language: create a quote, review it, then send it.
- Provide one primary "New quote" button.

No quotes in a selected bucket:

- Explain what belongs in the bucket and offer a useful adjacent action, such as switching to Active or creating a quote.

Send errors:

- Preserve the current API detail, but add user-facing context: missing contact, delivery provider failure, or saved-but-not-sent when applicable.

Unsaved changes:

- Use a visible dirty state near the main action area.
- Prevent ambiguous send/convert behavior when the user has edited totals but not saved.

## Accessibility

- Maintain WCAG AA contrast for body text, helper text, buttons, badges, and placeholders.
- Status must use text labels, not color alone.
- Touch targets remain at least 44px.
- Mobile layout must be verified at 390px.
- Motion should be limited to state feedback and respect reduced-motion preferences.

## Testing And Verification

Automated checks:

- Run `pnpm lint`.
- Run relevant tests if quote/pricing helpers are touched.
- Run `pnpm build` if the implementation changes shared components or route-level code.

Manual visual checks:

- `/quotes` at 390px and desktop width.
- `/quotes/new` form and review states at 390px.
- `/quotes/[id]` with draft, sent, and approved quotes if available.
- Empty quotes list and no-results filter state.
- Long client names, long addresses, and multi-line item descriptions.
- Missing email/phone send readiness.
- Unsaved line-item edit before send/convert.

## Implementation Notes

Start with `/quotes` because it establishes the workflow language. Then update quote detail to match. Finally align the new quote review state so the first-create and later-review experiences feel like the same product.

Avoid decorative gradients or new illustrative elements. The improvement should come from clearer structure, contrast, hierarchy, labels, and action placement.
