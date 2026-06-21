# Launch Readiness Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app launch readiness checklist that moves Taskrel toward a sellable self-serve contractor activation path.

**Architecture:** Create a pure readiness model that scores existing contractor profile, delivery configuration, payment setup, and first quote creation. Render that model on the dashboard so a new contractor sees exactly what must be completed before sending a professional quote. Keep the implementation schema-free by using existing contractor columns and environment checks.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Supabase, Tailwind CSS, Vitest.

## Global Constraints

- Do not add a new database migration for this slice.
- Keep AI as supporting workflow help, not the main activation message.
- Use existing Taskrel visual language: dark operational surfaces, blue primary action, amber attention, green completion.
- Follow TDD for the pure readiness model.

---

### Task 1: Launch Readiness Model

**Files:**
- Create: `src/lib/launch-readiness.ts`
- Create: `src/lib/launch-readiness.test.ts`

**Interfaces:**
- Produces: `buildLaunchReadiness(input: LaunchReadinessInput): LaunchReadinessState`
- Produces: `LaunchReadinessState` with `items`, `completedCount`, `totalCount`, `percentComplete`, `readyToSendFirstQuote`

- [x] **Step 1: Write failing tests**

Test profile, delivery, payments, and first quote readiness from plain inputs.

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/launch-readiness.test.ts`

- [x] **Step 3: Implement model**

Create deterministic checklist items with labels, details, hrefs, completion booleans, and impact copy.

- [x] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/launch-readiness.test.ts`

### Task 2: Dashboard Checklist UI

**Files:**
- Create: `src/components/dashboard/launch-readiness-checklist.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `LaunchReadinessState`

- [x] **Step 1: Fetch readiness inputs**

Select contractor document, billing, delivery, and quote count fields in `DashboardPage`.

- [x] **Step 2: Render checklist above the active work queue**

Use a compact operational panel with progress, item statuses, and direct action links.

- [x] **Step 3: Keep complete state useful**

When all items are complete, show that the workspace is ready and keep the first quote action visible.

### Task 3: Navigation Copy Alignment

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

**Interfaces:**
- No new exported interfaces.

- [x] **Step 1: Rename primary create CTA**

Change "Create New" to "New quote" in the desktop sidebar.

- [x] **Step 2: Rename mobile AI tab**

Change visible mobile "AI" label to "Next" while keeping the route unchanged for this slice.

### Task 4: Verification

**Files:**
- No code files.

- [x] **Step 1: Run readiness tests**

Run: `pnpm exec vitest run src/lib/launch-readiness.test.ts`

- [x] **Step 2: Run existing workflow tests**

Run: `pnpm exec vitest run src/components/quotes/quote-workflow-model.test.ts src/lib/pricing.test.ts src/lib/quote-document.test.ts`

- [x] **Step 3: Run lint**

Run: `pnpm lint`
