# Taskrel Quotes Workflow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clearer quote workflow so contractors can see what needs review, confidently edit/send quotes, and move approved work toward invoicing.

**Architecture:** Add a small pure quote workflow model used by the list, detail, and new quote review screens. Redesign `/quotes` around work buckets and next actions, then align quote detail and new quote review around readiness, delivery, and unsaved-change states.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Phosphor icons, Vitest for pure helper tests.

## Global Constraints

- Keep dark mode for eye comfort while improving contrast, separation, and hierarchy.
- Mobile-first at 390px before desktop refinement.
- No new backend status fields or persistence.
- Status must use text labels, not color alone.
- Touch targets remain at least 44px.
- Avoid decorative gradients, novelty illustrations, and analytics-first layout.

---

### Task 1: Shared Quote Workflow Model

**Files:**
- Create: `src/components/quotes/quote-workflow-model.ts`
- Create: `src/components/quotes/quote-workflow-model.test.ts`

**Interfaces:**
- Produces: `getQuoteWorkflowState(quote: QuoteWorkflowInput): QuoteWorkflowState`
- Produces: `getQuoteWorkflowSummary(quotes: QuoteWorkflowInput[]): QuoteWorkflowSummary[]`
- Consumes: Existing quote status and delivery fields from quote list/detail pages.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { getQuoteWorkflowState, getQuoteWorkflowSummary } from "./quote-workflow-model";

const baseQuote = {
  id: "q1",
  client_name: "Ava Homeowner",
  client_address: "12 Palm Ave",
  total: 1200,
  status: "draft" as const,
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-02T00:00:00.000Z",
  scheduled_start: null,
  sent_via: [] as ("email" | "sms")[],
  client_email: "ava@example.com",
  client_phone: null,
  line_items: [{ description: "Paint bedroom", quantity: 1, unit_price: 1200, total: 1200 }],
  notes: "Includes materials",
};

describe("quote workflow model", () => {
  it("maps draft quotes to needs-review with send readiness", () => {
    const state = getQuoteWorkflowState(baseQuote);

    expect(state.bucket).toBe("needs_review");
    expect(state.bucketLabel).toBe("Needs review");
    expect(state.nextAction).toBe("Review & send");
    expect(state.deliveryLabel).toBe("Ready for email");
    expect(state.readiness.filter(item => item.complete)).toHaveLength(5);
  });

  it("marks sent quotes as waiting on client with follow-up action", () => {
    const state = getQuoteWorkflowState({
      ...baseQuote,
      status: "sent",
      sent_via: ["email", "sms"],
    });

    expect(state.bucket).toBe("waiting");
    expect(state.nextAction).toBe("Follow up");
    expect(state.deliveryLabel).toBe("Email + SMS");
  });

  it("aggregates quote counts and totals by workflow bucket", () => {
    const summary = getQuoteWorkflowSummary([
      baseQuote,
      { ...baseQuote, id: "q2", status: "approved", total: 900 },
      { ...baseQuote, id: "q3", status: "expired", total: 300 },
    ]);

    expect(summary.map(item => [item.key, item.count, item.total])).toEqual([
      ["needs_review", 1, 1200],
      ["waiting", 0, 0],
      ["approved", 1, 900],
      ["closed", 1, 300],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/quotes/quote-workflow-model.test.ts`

Expected: FAIL because `quote-workflow-model` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create typed helpers that map `draft`, `sent`, `approved`, `rejected`, and `expired` into workflow buckets, next-action labels, delivery labels, and readiness checklist items.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/quotes/quote-workflow-model.test.ts`

Expected: PASS.

---

### Task 2: Quotes Command Center

**Files:**
- Modify: `src/app/(app)/quotes/page.tsx`
- Modify: `src/components/quotes/quotes-workflow.tsx`

**Interfaces:**
- Consumes: `getQuoteWorkflowState` and `getQuoteWorkflowSummary` from Task 1.
- Produces: Redesigned `/quotes` list with work buckets, summary strip, search, card next-actions, and secondary pipeline insight.

- [ ] **Step 1: Update data shape**

Add `client_email`, `client_phone`, `line_items`, and `notes` to the Supabase select in `src/app/(app)/quotes/page.tsx` so readiness can be computed.

- [ ] **Step 2: Refactor quote filters**

Replace status-only filters with workflow bucket filters: `needs_review`, `waiting`, `approved`, and `closed`.

- [ ] **Step 3: Redesign page hierarchy**

Move the charts below the queue as a secondary `Pipeline insight` section. Add the state summary strip and bucket tabs above search/list.

- [ ] **Step 4: Redesign quote cards**

Each card should show client, amount, status badge, next action, delivery label, readiness count, last activity, and address/date metadata.

- [ ] **Step 5: Verify**

Run: `pnpm lint`

Expected: PASS.

---

### Task 3: Detail And New Quote Review Alignment

**Files:**
- Modify: `src/app/(app)/quotes/[id]/page.tsx`
- Modify: `src/app/(app)/quotes/new/page.tsx`

**Interfaces:**
- Consumes: `getQuoteWorkflowState` from Task 1.
- Produces: Readiness checklist and clearer action panels on detail and generated-review screens.

- [ ] **Step 1: Add detail workflow header**

Use `getQuoteWorkflowState(quote)` to show current bucket, next action, delivery state, dirty/saved state, and total.

- [ ] **Step 2: Add readiness checklist**

Render client contact, line items, totals, note/terms, preview, and send channel as text-labeled checklist items. Do not rely on color alone.

- [ ] **Step 3: Clarify detail actions**

When `dirty` is true, make saving the primary action and visually explain that sending/converting should happen after saving. Keep send/resend and convert actions clear once saved.

- [ ] **Step 4: Align new quote review**

Use the same readiness and delivery vocabulary in the generated quote review step. Keep assistant notes secondary to editable quote content.

- [ ] **Step 5: Verify**

Run: `pnpm lint`

Expected: PASS.

Run: `pnpm exec vitest run src/components/quotes/quote-workflow-model.test.ts src/lib/pricing.test.ts src/lib/quote-document.test.ts`

Expected: PASS.

Run: `pnpm build`

Expected: PASS.
