# Taskrel Onboarding Readiness Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared readiness system across onboarding, settings, quote creation, billing, invoice payment processing, webhooks, and empty states so Taskrel always shows whether an action is complete, optional, needs attention, or blocked by an error.

**Architecture:** Add small pure readiness models under `src/lib/readiness/` and use them from focused form components. Update server actions and routes to persist the existing contractor and quote fields, then wire compact status chips and readiness panels into onboarding, settings, billing, quote creation, invoice detail, and existing empty states. Keep database shape unchanged for the first implementation pass.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Supabase, Stripe, SendGrid, Twilio, Vitest.

## Global Constraints

- Status labels must include text, not color alone.
- Color cannot be the only status signal.
- Touch targets should be at least 44px.
- Inputs need visible labels, not placeholders alone.
- Mobile layouts should be verified at 390px.
- No new database fields are required for the initial implementation.
- The visible Logo URL input should be removed.
- Missing logo is Optional, not an error.
- Missing overhead is Optional when intentionally off.
- Quote date must default to today's date and stay separate from scheduled work date.
- Missing client contact blocks send, not draft save.
- Missing Stripe Connect is Needs attention where payment collection matters.
- Webhook confirmation delay should show a pending state instead of implying payment or subscription failed immediately.
- Empty states should never be blank panels.

---

## File Structure

- Create `src/lib/readiness/setup-readiness.ts`: pure helpers for setup, overhead, quote documents, billing, exports, quote form, invoice payment, webhook, and empty-state copy.
- Create `src/lib/readiness/setup-readiness.test.ts`: Vitest coverage for readiness rules and labels.
- Create `src/components/ui/readiness.tsx`: shared status chip, readiness row, section header, and compact list primitives.
- Create `src/components/settings/business-information-form.tsx`: editable business profile, trade, and internal cost form for settings.
- Modify `src/lib/actions/auth.ts`: extend onboarding save to include business info, quote document defaults, and overhead fields.
- Modify `src/lib/actions/settings.ts`: add `updateBusinessInformation`; keep quote document and overhead saves, but allow shared form use.
- Modify `src/app/(app)/onboarding/page.tsx`: replace trade-only setup with multi-section workspace setup and readiness summary.
- Modify `src/app/(app)/settings/page.tsx`: use editable business form, compact section states, hidden logo URL behavior, and better billing/export status summaries.
- Modify `src/components/settings/quote-document-settings-form.tsx`: remove visible `Logo URL` field; keep hidden `logo_url`; show logo status.
- Modify `src/components/settings/overhead-settings-form.tsx`: add toggle, internal preview, and Optional/Complete/Needs attention state.
- Modify `src/app/(app)/settings/billing/page.tsx`: read current contractor state and represent subscription/payment processing readiness.
- Modify `src/app/(app)/quotes/new/page.tsx`: add quote date calendar, optional scheduled work date, pre-generation readiness, and saved-but-not-sent messaging.
- Modify `src/app/api/quotes/route.ts`: accept intentional `created_at`, `scheduled_start`, and `scheduled_end` from quote creation.
- Modify `src/app/(app)/invoices/[id]/page.tsx`: show invoice readiness, payment link state, webhook pending/paid state, and sent-without-payment-link messages.
- Modify `src/app/api/invoices/[id]/send/route.ts`: return structured payment-link and channel readiness details.
- Modify `src/app/api/stripe/webhook/route.ts`: keep existing auto-updates and harden unmatched/partial payment handling.
- Modify list/detail empty states in `src/app/(app)/clients/page.tsx`, `src/app/(app)/invoices/page.tsx`, `src/app/(app)/jobs/page.tsx`, `src/app/(app)/calendar/page.tsx`, `src/components/quotes/quotes-workflow.tsx`, and `src/app/(app)/dashboard/page.tsx`.

---

### Task 1: Shared Readiness Model

**Files:**
- Create: `src/lib/readiness/setup-readiness.ts`
- Create: `src/lib/readiness/setup-readiness.test.ts`

**Interfaces:**
- Produces: `type ReadinessState = "complete" | "needs_attention" | "optional" | "error" | "pending"`
- Produces: `type ReadinessItem = { key: string; label: string; state: ReadinessState; detail: string; actionLabel?: string; href?: string }`
- Produces: `getBusinessReadiness(input: BusinessReadinessInput): ReadinessItem`
- Produces: `getOverheadReadiness(input: OverheadReadinessInput): ReadinessItem`
- Produces: `getQuoteDocumentReadiness(input: QuoteDocumentReadinessInput): ReadinessItem`
- Produces: `getBillingReadiness(input: BillingReadinessInput): ReadinessItem[]`
- Produces: `getQuoteFormReadiness(input: QuoteFormReadinessInput): ReadinessItem[]`
- Produces: `getInvoicePaymentReadiness(input: InvoicePaymentReadinessInput): ReadinessItem[]`
- Produces: `getWebhookReadiness(input: WebhookReadinessInput): ReadinessItem`
- Produces: `emptyStateFor(kind: EmptyStateKind): { title: string; body: string; actionLabel?: string; href?: string }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/readiness/setup-readiness.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  emptyStateFor,
  getBillingReadiness,
  getBusinessReadiness,
  getInvoicePaymentReadiness,
  getOverheadReadiness,
  getQuoteDocumentReadiness,
  getQuoteFormReadiness,
  getWebhookReadiness,
} from "./setup-readiness";

describe("setup readiness", () => {
  it("marks required business information complete only when identity and trade fields exist", () => {
    expect(getBusinessReadiness({
      business_name: "APR Painting",
      business_type: "home_improvement",
      trades: ["painting"],
      primary_trade: "painting",
    }).state).toBe("complete");

    expect(getBusinessReadiness({
      business_name: "APR Painting",
      business_type: null,
      trades: ["painting"],
      primary_trade: "painting",
    })).toMatchObject({
      state: "needs_attention",
      detail: "Add business type.",
    });
  });

  it("treats overhead as optional when intentionally off and complete when values are enabled", () => {
    expect(getOverheadReadiness({ enabled: false, overhead_percent: 0, overhead_fixed_per_job: 0 }).state).toBe("optional");
    expect(getOverheadReadiness({ enabled: true, overhead_percent: 10, overhead_fixed_per_job: 250 }).state).toBe("complete");
    expect(getOverheadReadiness({ enabled: true, overhead_percent: 150, overhead_fixed_per_job: 0 })).toMatchObject({
      state: "needs_attention",
      detail: "Overhead percent must be between 0 and 100.",
    });
  });

  it("keeps quote documents optional when only a template exists and complete when client-facing defaults exist", () => {
    expect(getQuoteDocumentReadiness({ quote_template_preset: "classic" }).state).toBe("optional");
    expect(getQuoteDocumentReadiness({
      quote_template_preset: "classic",
      logo_url: "https://example.com/logo.png",
    }).state).toBe("complete");
  });

  it("separates subscription readiness from payment processing readiness", () => {
    expect(getBillingReadiness({
      subscription_status: "active",
      stripe_connect_account_id: null,
      connectReturnState: null,
      billingConfigured: true,
      connectConfigured: true,
    }).map(item => [item.key, item.state])).toEqual([
      ["subscription", "complete"],
      ["payment_processing", "needs_attention"],
    ]);
  });

  it("marks quote form date complete by default and scheduled work optional", () => {
    const items = getQuoteFormReadiness({
      client_name: "Maria",
      client_email: "",
      client_phone: "",
      job_description: "Paint two bedrooms and repair drywall.",
      quote_date: "2026-06-21",
      scheduled_start: null,
    });

    expect(items.find(item => item.key === "quote_date")?.state).toBe("complete");
    expect(items.find(item => item.key === "schedule")?.state).toBe("optional");
    expect(items.find(item => item.key === "send_channel")?.state).toBe("needs_attention");
  });

  it("represents invoice payment links and webhook-paid states separately", () => {
    expect(getInvoicePaymentReadiness({
      client_email: "client@example.com",
      client_phone: null,
      total: 1200,
      stripe_connect_account_id: null,
      stripe_payment_link: null,
      status: "sent",
      amount_paid: 0,
      paid_at: null,
      sendgridConfigured: true,
      twilioConfigured: false,
    }).find(item => item.key === "payment_link")).toMatchObject({
      state: "needs_attention",
      detail: "Set up Stripe Connect to include online payment.",
    });

    expect(getInvoicePaymentReadiness({
      client_email: "client@example.com",
      client_phone: null,
      total: 1200,
      stripe_connect_account_id: "acct_123",
      stripe_payment_link: "https://pay.stripe.com/test",
      status: "paid",
      amount_paid: 1200,
      paid_at: "2026-06-21T12:00:00.000Z",
      sendgridConfigured: true,
      twilioConfigured: false,
    }).find(item => item.key === "webhook_payment")).toMatchObject({
      state: "complete",
      detail: "Payment recorded by Stripe.",
    });
  });

  it("represents webhook configuration and pending confirmation states", () => {
    expect(getWebhookReadiness({ webhookConfigured: false, pending: false }).state).toBe("error");
    expect(getWebhookReadiness({ webhookConfigured: true, pending: true }).state).toBe("pending");
    expect(getWebhookReadiness({ webhookConfigured: true, pending: false }).state).toBe("complete");
  });

  it("returns actionable empty-state copy", () => {
    expect(emptyStateFor("quotes")).toEqual({
      title: "No quotes yet",
      body: "Create the first quote to start a client workflow.",
      actionLabel: "Create quote",
      href: "/quotes/new",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/readiness/setup-readiness.test.ts`

Expected: FAIL because `src/lib/readiness/setup-readiness.ts` does not exist.

- [ ] **Step 3: Implement the pure readiness helpers**

Create `src/lib/readiness/setup-readiness.ts` with these exports:

```ts
import type { BusinessType, InvoiceStatus, QuoteTemplatePreset, Trade } from "@/types";

export type ReadinessState = "complete" | "needs_attention" | "optional" | "error" | "pending";

export type ReadinessItem = {
  key: string;
  label: string;
  state: ReadinessState;
  detail: string;
  actionLabel?: string;
  href?: string;
};

export type BusinessReadinessInput = {
  business_name?: string | null;
  business_type?: BusinessType | string | null;
  trades?: (Trade | string)[] | null;
  primary_trade?: Trade | string | null;
};

export type OverheadReadinessInput = {
  enabled: boolean;
  overhead_percent: number | string | null;
  overhead_fixed_per_job: number | string | null;
  migrationMissing?: boolean;
};

export type QuoteDocumentReadinessInput = {
  quote_template_preset?: QuoteTemplatePreset | null;
  logo_url?: string | null;
  business_phone?: string | null;
  business_website?: string | null;
  license_text?: string | null;
  quote_default_terms?: string | null;
  quote_default_note?: string | null;
  quote_policy_text?: string | null;
  uploading?: boolean;
  uploadError?: string | null;
};

export type BillingReadinessInput = {
  subscription_status?: "trialing" | "active" | "past_due" | "canceled" | string | null;
  stripe_connect_account_id?: string | null;
  connectReturnState?: "success" | "refresh" | "error" | null;
  billingConfigured: boolean;
  connectConfigured: boolean;
};

export type QuoteFormReadinessInput = {
  client_name: string;
  client_email: string;
  client_phone: string;
  job_description: string;
  quote_date: string;
  scheduled_start: string | null;
};

export type InvoicePaymentReadinessInput = {
  client_email: string | null;
  client_phone: string | null;
  total: number | string | null;
  stripe_connect_account_id: string | null;
  stripe_payment_link: string | null;
  status: InvoiceStatus;
  amount_paid: number | string | null;
  paid_at: string | null;
  sendgridConfigured: boolean;
  twilioConfigured: boolean;
};

export type WebhookReadinessInput = {
  webhookConfigured: boolean;
  pending: boolean;
  error?: string | null;
};

export type EmptyStateKind =
  | "quotes"
  | "quote_results"
  | "invoices"
  | "jobs"
  | "calendar_day"
  | "clients"
  | "exports"
  | "settings_section";

function present(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function getBusinessReadiness(input: BusinessReadinessInput): ReadinessItem {
  if (!present(input.business_name)) {
    return { key: "business", label: "Business information", state: "needs_attention", detail: "Add business name.", actionLabel: "Edit business" };
  }
  if (!present(input.business_type)) {
    return { key: "business", label: "Business information", state: "needs_attention", detail: "Add business type.", actionLabel: "Edit business" };
  }
  if (!input.trades?.length) {
    return { key: "business", label: "Business information", state: "needs_attention", detail: "Choose at least one trade.", actionLabel: "Edit trades" };
  }
  if (!present(input.primary_trade)) {
    return { key: "business", label: "Business information", state: "needs_attention", detail: "Choose a primary trade.", actionLabel: "Edit trades" };
  }
  return { key: "business", label: "Business information", state: "complete", detail: "Business identity and trade profile are ready." };
}

export function getOverheadReadiness(input: OverheadReadinessInput): ReadinessItem {
  if (input.migrationMissing) {
    return { key: "overhead", label: "Internal pricing", state: "error", detail: "Run the latest Supabase migration to save overhead costs." };
  }
  const percent = num(input.overhead_percent);
  const fixed = num(input.overhead_fixed_per_job);
  if (!Number.isFinite(percent) || !Number.isFinite(fixed)) {
    return { key: "overhead", label: "Internal pricing", state: "needs_attention", detail: "Overhead values must be numbers." };
  }
  if (percent < 0 || fixed < 0) {
    return { key: "overhead", label: "Internal pricing", state: "needs_attention", detail: "Overhead values must be zero or more." };
  }
  if (percent > 100) {
    return { key: "overhead", label: "Internal pricing", state: "needs_attention", detail: "Overhead percent must be between 0 and 100." };
  }
  if (!input.enabled || (percent === 0 && fixed === 0)) {
    return { key: "overhead", label: "Internal pricing", state: "optional", detail: "No overhead is added to pricing recommendations." };
  }
  return { key: "overhead", label: "Internal pricing", state: "complete", detail: "Internal overhead is included in pricing recommendations." };
}

export function getQuoteDocumentReadiness(input: QuoteDocumentReadinessInput): ReadinessItem {
  if (input.uploadError) {
    return { key: "quote_documents", label: "Quote documents", state: "error", detail: input.uploadError };
  }
  if (input.uploading) {
    return { key: "quote_documents", label: "Quote documents", state: "pending", detail: "Logo upload is still in progress." };
  }
  if (!input.quote_template_preset) {
    return { key: "quote_documents", label: "Quote documents", state: "needs_attention", detail: "Choose a quote template." };
  }
  const hasClientFacingDefault = [
    input.logo_url,
    input.business_phone,
    input.business_website,
    input.license_text,
    input.quote_default_terms,
    input.quote_default_note,
    input.quote_policy_text,
  ].some(present);
  return hasClientFacingDefault
    ? { key: "quote_documents", label: "Quote documents", state: "complete", detail: "Client-facing quote defaults are ready." }
    : { key: "quote_documents", label: "Quote documents", state: "optional", detail: "Template is ready; logo, terms, and defaults can be added later." };
}

export function getBillingReadiness(input: BillingReadinessInput): ReadinessItem[] {
  const subscription: ReadinessItem = !input.billingConfigured
    ? { key: "subscription", label: "Taskrel subscription", state: "error", detail: "Stripe subscription billing is not configured." }
    : input.subscription_status === "active" || input.subscription_status === "trialing"
      ? { key: "subscription", label: "Taskrel subscription", state: "complete", detail: `Subscription is ${input.subscription_status}.` }
      : input.subscription_status === "past_due" || input.subscription_status === "canceled"
        ? { key: "subscription", label: "Taskrel subscription", state: "needs_attention", detail: `Subscription is ${input.subscription_status}.`, actionLabel: "Fix billing", href: "/settings/billing" }
        : { key: "subscription", label: "Taskrel subscription", state: "needs_attention", detail: "Subscription is not started.", actionLabel: "Subscribe", href: "/settings/billing" };

  const paymentProcessing: ReadinessItem = !input.connectConfigured
    ? { key: "payment_processing", label: "Payment processing", state: "error", detail: "Stripe Connect is not configured." }
    : input.connectReturnState === "refresh"
      ? { key: "payment_processing", label: "Payment processing", state: "needs_attention", detail: "Continue Stripe Connect setup.", actionLabel: "Continue setup", href: "/settings/billing" }
      : input.stripe_connect_account_id
        ? { key: "payment_processing", label: "Payment processing", state: "complete", detail: "Stripe Connect is ready for invoice payments." }
        : { key: "payment_processing", label: "Payment processing", state: "needs_attention", detail: "Set up Stripe Connect to collect invoice payments.", actionLabel: "Set up payments", href: "/settings/billing" };

  return [subscription, paymentProcessing];
}

export function getQuoteFormReadiness(input: QuoteFormReadinessInput): ReadinessItem[] {
  const hasClient = present(input.client_name);
  const hasChannel = present(input.client_email) || present(input.client_phone);
  const scopeLength = input.job_description.replace(/\s/g, "").length;
  return [
    hasClient
      ? { key: "client", label: "Client", state: "complete", detail: "Client name is ready." }
      : { key: "client", label: "Client", state: "needs_attention", detail: "Add client name." },
    hasChannel
      ? { key: "send_channel", label: "Send channel", state: "complete", detail: "Email or phone is ready for sending." }
      : { key: "send_channel", label: "Send channel", state: "needs_attention", detail: "Add email or phone before sending." },
    scopeLength >= 20
      ? { key: "scope", label: "Scope", state: "complete", detail: "Job description is detailed enough to generate." }
      : { key: "scope", label: "Scope", state: "needs_attention", detail: "Describe the job with at least 20 characters." },
    present(input.quote_date)
      ? { key: "quote_date", label: "Quote date", state: "complete", detail: "Quote date is set." }
      : { key: "quote_date", label: "Quote date", state: "needs_attention", detail: "Choose a quote date." },
    input.scheduled_start
      ? { key: "schedule", label: "Work date", state: "complete", detail: "Scheduled work date is set." }
      : { key: "schedule", label: "Work date", state: "optional", detail: "Schedule can be added later." },
  ];
}

export function getInvoicePaymentReadiness(input: InvoicePaymentReadinessInput): ReadinessItem[] {
  const total = num(input.total);
  const paid = num(input.amount_paid);
  return [
    input.client_email
      ? input.sendgridConfigured
        ? { key: "email", label: "Email", state: "complete", detail: "Email send is ready." }
        : { key: "email", label: "Email", state: "error", detail: "Email provider is not configured." }
      : { key: "email", label: "Email", state: "needs_attention", detail: "Add client email before email send." },
    input.client_phone
      ? input.twilioConfigured
        ? { key: "sms", label: "SMS", state: "complete", detail: "SMS send is ready." }
        : { key: "sms", label: "SMS", state: "error", detail: "SMS provider is not configured." }
      : { key: "sms", label: "SMS", state: "optional", detail: "Add client phone to send SMS." },
    total > 0
      ? { key: "total", label: "Invoice total", state: "complete", detail: "Invoice total is ready." }
      : { key: "total", label: "Invoice total", state: "needs_attention", detail: "Invoice total must be greater than zero." },
    input.stripe_payment_link
      ? { key: "payment_link", label: "Payment link", state: "complete", detail: "Online payment link is ready." }
      : input.stripe_connect_account_id
        ? { key: "payment_link", label: "Payment link", state: "pending", detail: "Payment link will be created when invoice is sent." }
        : { key: "payment_link", label: "Payment link", state: "needs_attention", detail: "Set up Stripe Connect to include online payment." },
    input.status === "paid" && paid >= total && input.paid_at
      ? { key: "webhook_payment", label: "Payment status", state: "complete", detail: "Payment recorded by Stripe." }
      : input.stripe_payment_link
        ? { key: "webhook_payment", label: "Payment status", state: "pending", detail: "Waiting for Stripe payment confirmation." }
        : { key: "webhook_payment", label: "Payment status", state: "optional", detail: "No online payment link has been sent." },
  ];
}

export function getWebhookReadiness(input: WebhookReadinessInput): ReadinessItem {
  if (!input.webhookConfigured) {
    return { key: "webhook", label: "Stripe updates", state: "error", detail: "Stripe updates are not configured." };
  }
  if (input.error) {
    return { key: "webhook", label: "Stripe updates", state: "error", detail: input.error };
  }
  if (input.pending) {
    return { key: "webhook", label: "Stripe updates", state: "pending", detail: "Waiting for Stripe confirmation." };
  }
  return { key: "webhook", label: "Stripe updates", state: "complete", detail: "Stripe updates are configured." };
}

export function emptyStateFor(kind: EmptyStateKind) {
  const map: Record<EmptyStateKind, { title: string; body: string; actionLabel?: string; href?: string }> = {
    quotes: { title: "No quotes yet", body: "Create the first quote to start a client workflow.", actionLabel: "Create quote", href: "/quotes/new" },
    quote_results: { title: "No matching quotes", body: "No quotes match this search or work bucket.", actionLabel: "Clear filters" },
    invoices: { title: "No invoices yet", body: "Invoices are created from approved quotes.", actionLabel: "Review quotes", href: "/quotes" },
    jobs: { title: "No active jobs yet", body: "Approved quotes with scheduled dates become jobs.", actionLabel: "Open quotes", href: "/quotes" },
    calendar_day: { title: "No work scheduled", body: "Scheduled jobs will appear on this day after quote approval." },
    clients: { title: "No clients yet", body: "Clients are created from sent quotes and invoices.", actionLabel: "Create quote", href: "/quotes/new" },
    exports: { title: "No live export connected", body: "CSV export is available now. Google Sheets sync is optional.", actionLabel: "Connect Google Sheets", href: "/api/google-sheets/connect" },
    settings_section: { title: "Nothing configured yet", body: "Add the fields that matter for this workflow. Optional fields can stay blank." },
  };
  return map[kind];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/readiness/setup-readiness.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/readiness/setup-readiness.ts src/lib/readiness/setup-readiness.test.ts
git commit -m "Add shared setup readiness model"
```

---

### Task 2: Shared Readiness UI Primitives

**Files:**
- Create: `src/components/ui/readiness.tsx`

**Interfaces:**
- Consumes: `ReadinessItem`, `ReadinessState` from `@/lib/readiness/setup-readiness`
- Produces: `ReadinessChip`, `ReadinessRow`, `ReadinessList`, `ReadinessSectionHeader`

- [ ] **Step 1: Create shared UI primitives**

Create `src/components/ui/readiness.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle, SealCheck } from "@/components/ui/icons";
import type { ReadinessItem, ReadinessState } from "@/lib/readiness/setup-readiness";

const stateCopy: Record<ReadinessState, string> = {
  complete: "Complete",
  needs_attention: "Needs attention",
  optional: "Optional",
  error: "Error",
  pending: "Pending",
};

const stateClass: Record<ReadinessState, string> = {
  complete: "bg-[var(--tr-success-bg)] text-[var(--tr-green)] ring-[var(--tr-green)]/30",
  needs_attention: "bg-[var(--tr-warning-bg)] text-[var(--tr-amber)] ring-[var(--tr-amber)]/30",
  optional: "bg-[var(--tr-surface-2)] text-[var(--tr-text-muted)] ring-[var(--tr-border)]",
  error: "bg-red-500/10 text-red-300 ring-red-400/30",
  pending: "bg-[var(--tr-badge-info-bg)] text-[var(--tr-badge-info-text)] ring-[var(--tr-badge-info-ring)]",
};

function iconFor(state: ReadinessState) {
  if (state === "complete") return <CheckCircle size={16} weight="duotone" />;
  return <SealCheck size={16} weight="duotone" />;
}

export function ReadinessChip({ state }: { state: ReadinessState }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${stateClass[state]}`}>
      {iconFor(state)}
      {stateCopy[state]}
    </span>
  );
}

export function ReadinessRow({ item }: { item: ReadinessItem }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-[var(--tr-bg-soft)] p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--tr-text)]">{item.label}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--tr-text-muted)]">{item.detail}</p>
        {item.actionLabel && item.href && (
          <Link href={item.href} className="mt-2 inline-flex text-xs font-bold text-[var(--tr-primary)]">
            {item.actionLabel}
          </Link>
        )}
      </div>
      <ReadinessChip state={item.state} />
    </div>
  );
}

export function ReadinessList({ items }: { items: ReadinessItem[] }) {
  return (
    <div className="space-y-2">
      {items.map(item => <ReadinessRow key={item.key} item={item} />)}
    </div>
  );
}

export function ReadinessSectionHeader({
  title,
  subtitle,
  item,
  icon,
}: {
  title: string;
  subtitle?: string;
  item: ReadinessItem;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--tr-text)]">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm leading-5 text-[var(--tr-text-muted)]">{subtitle}</p>}
      </div>
      <ReadinessChip state={item.state} />
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: PASS, or fail only on pre-existing unrelated files. If it fails on `src/components/ui/readiness.tsx`, fix that file before continuing.

- [ ] **Step 3: Commit**

```powershell
git add -- src/components/ui/readiness.tsx
git commit -m "Add readiness UI primitives"
```

---

### Task 3: Settings Actions And Editable Business Information

**Files:**
- Modify: `src/lib/actions/settings.ts`
- Create: `src/components/settings/business-information-form.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `getBusinessReadiness`, `getOverheadReadiness`
- Produces: `updateBusinessInformation(_: SettingsActionState, formData: FormData): Promise<SettingsActionState>`
- Produces: `BusinessInformationForm`

- [ ] **Step 1: Add `updateBusinessInformation` server action**

Modify `src/lib/actions/settings.ts` by adding this import and action after `presets`:

```ts
import type { BusinessType, QuoteTemplatePreset, Trade } from "@/types";
```

```ts
const businessTypes: BusinessType[] = [
  "home_improvement",
  "mechanical_services",
  "outdoor_services",
  "general_contracting",
  "other",
];
const trades: Trade[] = ["painting", "roofing", "flooring", "landscaping", "hvac", "plumbing", "electrical"];

export async function updateBusinessInformation(
  _: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in again." };

  const businessName = String(formData.get("business_name") ?? "").trim();
  const businessType = String(formData.get("business_type") ?? "") as BusinessType;
  const primaryTrade = String(formData.get("primary_trade") ?? "") as Trade;
  const selectedTrades = formData.getAll("trades").map(String).filter(Boolean) as Trade[];

  if (!businessName) return { error: "Add business name." };
  if (!businessTypes.includes(businessType)) return { error: "Choose a business type." };
  if (selectedTrades.length === 0 || selectedTrades.some(trade => !trades.includes(trade))) {
    return { error: "Choose at least one valid trade." };
  }
  if (!primaryTrade || !selectedTrades.includes(primaryTrade)) {
    return { error: "Choose a primary trade." };
  }

  const { error } = await supabase
    .from("contractors")
    .update({
      business_name: businessName,
      business_type: businessType,
      trade: primaryTrade,
      primary_trade: primaryTrade,
      trades: selectedTrades,
      business_phone: String(formData.get("business_phone") ?? "").trim() || null,
      business_website: String(formData.get("business_website") ?? "").trim() || null,
      license_text: String(formData.get("license_text") ?? "").trim() || null,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/onboarding");
  revalidatePath("/quotes");
  return { success: "Business information saved." };
}
```

- [ ] **Step 2: Create the editable settings form**

Create `src/components/settings/business-information-form.tsx`:

```tsx
"use client";

import { useActionState, useMemo, useState } from "react";
import { updateBusinessInformation, type SettingsActionState } from "@/lib/actions/settings";
import { BUSINESS_TYPE_LABELS, TRADE_LABELS, type BusinessType, type Contractor, type Trade } from "@/types";
import { getBusinessReadiness } from "@/lib/readiness/setup-readiness";
import { ReadinessSectionHeader } from "@/components/ui/readiness";

type Props = {
  contractor: Pick<
    Contractor,
    | "business_name"
    | "business_type"
    | "trade"
    | "primary_trade"
    | "trades"
    | "business_phone"
    | "business_website"
    | "license_text"
  >;
};

export function BusinessInformationForm({ contractor }: Props) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(updateBusinessInformation, undefined);
  const [businessType, setBusinessType] = useState<BusinessType | "">(contractor.business_type ?? "");
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>(contractor.trades?.length ? contractor.trades : contractor.trade ? [contractor.trade] : []);
  const [primaryTrade, setPrimaryTrade] = useState<Trade | "">(contractor.primary_trade ?? contractor.trade ?? "");
  const readiness = getBusinessReadiness({
    business_name: contractor.business_name,
    business_type: businessType,
    trades: selectedTrades,
    primary_trade: primaryTrade,
  });
  const primaryOptions = useMemo(() => selectedTrades, [selectedTrades]);

  function toggleTrade(trade: Trade) {
    setSelectedTrades(current => {
      const next = current.includes(trade) ? current.filter(item => item !== trade) : [...current, trade];
      if (!next.includes(primaryTrade as Trade)) setPrimaryTrade(next[0] ?? "");
      return next;
    });
  }

  return (
    <form action={formAction} className="rounded-lg bg-[var(--tr-surface)] p-4 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
      <ReadinessSectionHeader
        title="Business information"
        subtitle="This appears on quote documents and powers trade-specific quote generation."
        item={readiness}
      />

      <input type="hidden" name="business_type" value={businessType} />
      <input type="hidden" name="primary_trade" value={primaryTrade} />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">Business name</span>
          <input name="business_name" defaultValue={contractor.business_name} className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">Business phone</span>
          <input name="business_phone" defaultValue={contractor.business_phone ?? ""} className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">Website</span>
          <input name="business_website" defaultValue={contractor.business_website ?? ""} className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--tr-text-muted)]">License / insured text</span>
          <input name="license_text" defaultValue={contractor.license_text ?? ""} className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm" />
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--tr-text-muted)]">Business type</p>
          <div className="grid gap-2">
            {(Object.entries(BUSINESS_TYPE_LABELS) as [BusinessType, string][]).map(([type, label]) => (
              <button key={type} type="button" onClick={() => setBusinessType(type)} className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${businessType === type ? "border-[var(--tr-primary-edge)] bg-[var(--tr-primary-fill)] text-[var(--tr-primary)]" : "border-[var(--tr-border-soft)] text-[var(--tr-text-muted)]"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--tr-text-muted)]">Trades</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(TRADE_LABELS) as [Trade, string][]).map(([trade, label]) => {
              const active = selectedTrades.includes(trade);
              return (
                <button key={trade} type="button" onClick={() => toggleTrade(trade)} className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${active ? "border-[var(--tr-primary-edge)] bg-[var(--tr-primary-fill)] text-[var(--tr-primary)]" : "border-[var(--tr-border-soft)] text-[var(--tr-text-muted)]"}`}>
                  {label}
                  {active && <input type="hidden" name="trades" value={trade} />}
                </button>
              );
            })}
          </div>
          {primaryOptions.length > 0 && (
            <label className="mt-3 block">
              <span className="text-sm font-medium text-[var(--tr-text-muted)]">Primary quote trade</span>
              <select value={primaryTrade} onChange={event => setPrimaryTrade(event.target.value as Trade)} className="tr-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm">
                {primaryOptions.map(trade => <option key={trade} value={trade}>{TRADE_LABELS[trade]}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      {state?.error && <p className="mt-3 text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="mt-3 text-sm text-emerald-400">{state.success}</p>}
      <button type="submit" disabled={pending} className="tr-primary-action mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Saving..." : "Save business information"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Wire settings page selects and form**

Modify `src/app/(app)/settings/page.tsx`:

- Add `business_type, primary_trade, trades` to `contractorSelect` and `fallbackContractorSelect`.
- Import `BusinessInformationForm`.
- Replace the read-only `Surface` business rows with `<BusinessInformationForm contractor={...} />`.
- Keep billing/export sections but use readiness chips in Task 5.

Code to add near imports:

```ts
import { BusinessInformationForm } from "@/components/settings/business-information-form";
```

Code shape for the account section:

```tsx
{settingsContractor && (
  <BusinessInformationForm
    contractor={{
      business_name: settingsContractor.business_name,
      business_type: settingsContractor.business_type,
      trade: settingsContractor.trade,
      primary_trade: settingsContractor.primary_trade,
      trades: settingsContractor.trades ?? [],
      business_phone: settingsContractor.business_phone,
      business_website: settingsContractor.business_website,
      license_text: settingsContractor.license_text,
    }}
  />
)}
```

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

Expected: PASS, or fail only on pre-existing unrelated files. Fix any errors in `settings.ts`, `business-information-form.tsx`, or `settings/page.tsx`.

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/actions/settings.ts src/components/settings/business-information-form.tsx 'src/app/(app)/settings/page.tsx'
git commit -m "Add editable business information settings"
```

---

### Task 4: Quote Document And Overhead Form Readiness

**Files:**
- Modify: `src/components/settings/quote-document-settings-form.tsx`
- Modify: `src/components/settings/overhead-settings-form.tsx`

**Interfaces:**
- Consumes: `getQuoteDocumentReadiness`, `getOverheadReadiness`
- Produces: hidden `logo_url` field instead of visible Logo URL input
- Produces: overhead enable toggle and sample preview

- [ ] **Step 1: Hide the Logo URL field and add document readiness**

Modify `src/components/settings/quote-document-settings-form.tsx`:

- Import `getQuoteDocumentReadiness` and `ReadinessSectionHeader`.
- Compute readiness from `contractor`, `logoUrl`, `uploading`, and `uploadError`.
- Replace the visible `Field name="logo_url"` with `<input type="hidden" name="logo_url" value={logoUrl} />`.
- Keep upload, preview, save, and errors.

Target snippet:

```tsx
const readiness = getQuoteDocumentReadiness({
  ...contractor,
  logo_url: logoUrl,
  uploading,
  uploadError,
});
```

Target header:

```tsx
<ReadinessSectionHeader
  title="Quote documents"
  subtitle="These defaults appear on client-facing quote documents."
  item={readiness}
/>
<input type="hidden" name="logo_url" value={logoUrl} />
```

- [ ] **Step 2: Add overhead toggle and internal preview**

Modify `src/components/settings/overhead-settings-form.tsx`:

- Use `useState` for enabled, percent, and fixed values.
- Compute readiness with `getOverheadReadiness`.
- Show `Add overhead to pricing` toggle.
- Disable numeric fields when off.
- Show preview: `On a $2,500 quote, Taskrel considers $X overhead.`

Target preview function:

```tsx
function overheadPreview(percent: number, fixed: number) {
  const sampleSubtotal = 2500;
  return sampleSubtotal * (percent / 100) + fixed;
}
```

- [ ] **Step 3: Run targeted tests and lint**

Run: `pnpm exec vitest run src/lib/readiness/setup-readiness.test.ts`

Expected: PASS.

Run: `pnpm lint`

Expected: PASS, or fail only on pre-existing unrelated files. Fix any errors in the two touched forms.

- [ ] **Step 4: Commit**

```powershell
git add -- src/components/settings/quote-document-settings-form.tsx src/components/settings/overhead-settings-form.tsx
git commit -m "Add readiness to document and overhead settings"
```

---

### Task 5: Onboarding Workspace Setup Flow

**Files:**
- Modify: `src/lib/actions/auth.ts`
- Modify: `src/app/(app)/onboarding/page.tsx`

**Interfaces:**
- Consumes: business, overhead, quote document readiness helpers
- Produces: extended `completeOnboarding` payload support

- [ ] **Step 1: Extend `completeOnboarding` server action**

Modify `src/lib/actions/auth.ts` so `completeOnboarding` reads and saves:

```ts
const businessName = String(formData.get("business_name") ?? "").trim();
const businessPhone = String(formData.get("business_phone") ?? "").trim();
const businessWebsite = String(formData.get("business_website") ?? "").trim();
const licenseText = String(formData.get("license_text") ?? "").trim();
const logoUrl = String(formData.get("logo_url") ?? "").trim();
const quoteTemplatePreset = String(formData.get("quote_template_preset") ?? "classic");
const quoteDefaultNote = String(formData.get("quote_default_note") ?? "").trim();
const quoteDefaultTerms = String(formData.get("quote_default_terms") ?? "").trim();
const quotePolicyText = String(formData.get("quote_policy_text") ?? "").trim();
const overheadEnabled = formData.get("overhead_enabled") === "on";
const overheadPercent = overheadEnabled ? Number(formData.get("overhead_percent") ?? 0) : 0;
const overheadFixed = overheadEnabled ? Number(formData.get("overhead_fixed_per_job") ?? 0) : 0;
```

Validation:

```ts
if (!businessName) return { error: "Add business name." };
if (!Number.isFinite(overheadPercent) || overheadPercent < 0 || overheadPercent > 100) {
  return { error: "Overhead percent must be between 0 and 100." };
}
if (!Number.isFinite(overheadFixed) || overheadFixed < 0) {
  return { error: "Fixed overhead must be zero or more." };
}
```

Update payload:

```ts
{
  business_name: businessName,
  business_type: businessType,
  trade: primaryTrade,
  primary_trade: primaryTrade,
  trades,
  business_phone: businessPhone || null,
  business_website: businessWebsite || null,
  license_text: licenseText || null,
  logo_url: logoUrl || null,
  quote_template_preset: quoteTemplatePreset,
  quote_default_note: quoteDefaultNote || null,
  quote_default_terms: quoteDefaultTerms || null,
  quote_policy_text: quotePolicyText || null,
  overhead_percent: Math.round(overheadPercent * 1000) / 1000,
  overhead_fixed_per_job: Math.round(overheadFixed * 100) / 100,
  onboarding_complete: true,
}
```

If the update fails because `quote_policy_text` or `overhead_` columns are missing, return the exact message:

```ts
"Run the latest Supabase migrations before completing onboarding."
```

- [ ] **Step 2: Replace onboarding UI with four compact sections**

Modify `src/app/(app)/onboarding/page.tsx`:

- Add local state for business name, phone, website, license text.
- Add local state for overhead toggle/values.
- Add local state for logo URL and template/default document fields.
- Use `ReadinessList` in a right-side summary on desktop and above submit on mobile.
- Keep existing business type/trade selection.
- Add hidden `logo_url` input for logo upload state.
- Submit to `completeOnboarding`.

The summary items should be:

```tsx
const readinessItems = [
  getBusinessReadiness({ business_name: businessName, business_type: businessType, trades: selectedTrades, primary_trade: primaryTrade }),
  getOverheadReadiness({ enabled: overheadEnabled, overhead_percent: overheadPercent, overhead_fixed_per_job: overheadFixed }),
  getQuoteDocumentReadiness({ quote_template_preset: templatePreset, logo_url: logoUrl, business_phone: businessPhone, business_website: businessWebsite, license_text: licenseText, quote_default_terms: quoteDefaultTerms, quote_default_note: quoteDefaultNote, quote_policy_text: quotePolicyText }),
  ...getBillingReadiness({ subscription_status: null, stripe_connect_account_id: null, connectReturnState: null, billingConfigured: true, connectConfigured: true }),
];
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: PASS, or fail only on pre-existing unrelated files. Fix any errors in `auth.ts` or `onboarding/page.tsx`.

- [ ] **Step 4: Commit**

```powershell
git add -- src/lib/actions/auth.ts 'src/app/(app)/onboarding/page.tsx'
git commit -m "Build workspace setup onboarding flow"
```

---

### Task 6: Billing And Payment Processing Readiness

**Files:**
- Modify: `src/app/(app)/settings/billing/page.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `getBillingReadiness`, `getWebhookReadiness`, `ReadinessList`, `ReadinessChip`
- Produces: billing page that reads contractor state

- [ ] **Step 1: Convert billing page to read contractor state**

Modify `src/app/(app)/settings/billing/page.tsx`:

- Keep client interactivity in a child component if needed.
- Add a server wrapper that loads `subscription_status`, `stripe_connect_account_id`, and env readiness.
- Pass values into a client component.

Use this split:

```tsx
// page.tsx server component
import { redirect } from "next/navigation";
import { getMissingEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: contractor } = await supabase
    .from("contractors")
    .select("subscription_status, stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();
  return (
    <BillingClient
      subscriptionStatus={contractor?.subscription_status ?? null}
      stripeConnectAccountId={contractor?.stripe_connect_account_id ?? null}
      billingConfigured={getMissingEnv(["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "NEXT_PUBLIC_APP_URL"]).length === 0}
      connectConfigured={getMissingEnv(["STRIPE_SECRET_KEY", "NEXT_PUBLIC_APP_URL"]).length === 0}
      webhookConfigured={getMissingEnv(["STRIPE_WEBHOOK_SECRET"]).length === 0}
    />
  );
}
```

Create `src/app/(app)/settings/billing/billing-client.tsx` by moving current button logic there and rendering:

```tsx
<ReadinessList items={[
  ...getBillingReadiness({ subscription_status: subscriptionStatus, stripe_connect_account_id: stripeConnectAccountId, connectReturnState, billingConfigured, connectConfigured }),
  getWebhookReadiness({ webhookConfigured, pending: subscribed && subscriptionStatus !== "active" && subscriptionStatus !== "trialing" }),
]} />
```

- [ ] **Step 2: Add compact billing readiness to settings page**

Modify `src/app/(app)/settings/page.tsx` billing section to use `getBillingReadiness` with the contractor data and render status chips beside the subscription and payment processing rows.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: PASS, or fail only on pre-existing unrelated files. Fix billing files if needed.

- [ ] **Step 4: Commit**

```powershell
git add -- 'src/app/(app)/settings/billing/page.tsx' 'src/app/(app)/settings/billing/billing-client.tsx' 'src/app/(app)/settings/page.tsx'
git commit -m "Represent billing and payment readiness"
```

---

### Task 7: Quote Creation Date And Pre-Generation Readiness

**Files:**
- Modify: `src/app/(app)/quotes/new/page.tsx`
- Modify: `src/app/api/quotes/route.ts`

**Interfaces:**
- Consumes: `getQuoteFormReadiness`, `ReadinessList`
- Produces: quote date calendar input, optional scheduled work date, adaptive action copy

- [ ] **Step 1: Add quote date and schedule state**

Modify `src/app/(app)/quotes/new/page.tsx`:

```ts
function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

const [quoteDate, setQuoteDate] = useState(todayDateInput());
const [scheduledStart, setScheduledStart] = useState("");
const [scheduledEnd, setScheduledEnd] = useState("");
```

Add a form section:

```tsx
<Surface className="p-5">
  <h2 className="mb-4 text-lg font-bold text-white">Dates</h2>
  <div className="grid gap-3 md:grid-cols-3">
    <Input label="Quote date" type="date" value={quoteDate} onChange={event => setQuoteDate(event.target.value)} required />
    <Input label="Scheduled start" type="datetime-local" value={scheduledStart} onChange={event => setScheduledStart(event.target.value)} />
    <Input label="Scheduled end" type="datetime-local" value={scheduledEnd} onChange={event => setScheduledEnd(event.target.value)} />
  </div>
  <p className="mt-2 text-xs leading-5 text-[var(--tr-text-muted)]">Quote date appears on the client quote. Scheduled dates are optional and create calendar context later.</p>
</Surface>
```

- [ ] **Step 2: Add pre-generation readiness panel and adaptive submit copy**

Inside the form step, compute:

```ts
const formReadiness = getQuoteFormReadiness({
  client_name: clientName,
  client_email: clientEmail,
  client_phone: clientPhone,
  job_description: jobDescription,
  quote_date: quoteDate,
  scheduled_start: scheduledStart || null,
});
const canGenerate = formReadiness.every(item => item.state !== "error")
  && formReadiness.find(item => item.key === "client")?.state === "complete"
  && formReadiness.find(item => item.key === "scope")?.state === "complete"
  && formReadiness.find(item => item.key === "quote_date")?.state === "complete";
const generateLabel = !clientName.trim()
  ? "Add client name"
  : jobDescription.replace(/\s/g, "").length < 20
    ? "Describe job"
    : "Generate Quote";
```

Render `ReadinessList` in the assistant panel and disable generate when `!canGenerate`.

- [ ] **Step 3: Save quote date and scheduled fields**

Modify `handleSave` body in `src/app/(app)/quotes/new/page.tsx`:

```ts
scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
created_at: quoteDate ? new Date(`${quoteDate}T12:00:00`).toISOString() : undefined,
```

Modify `src/app/api/quotes/route.ts` insert payload to allow `created_at` only when present:

```ts
const createdAt = body.created_at ? { created_at: body.created_at } : {};
...
.insert({
  ...body,
  ...createdAt,
  ...
})
```

- [ ] **Step 4: Add quote date to review readiness**

When calling `getQuoteWorkflowState`, pass `created_at` from `quoteDate`:

```ts
created_at: quoteDate ? new Date(`${quoteDate}T12:00:00`).toISOString() : new Date().toISOString(),
```

Also include a readiness row from `getQuoteFormReadiness` or a visible summary line: `Quote date: Jun 21, 2026`.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`

Expected: PASS, or fail only on pre-existing unrelated files. Fix quote creation files if needed.

- [ ] **Step 6: Commit**

```powershell
git add -- 'src/app/(app)/quotes/new/page.tsx' src/app/api/quotes/route.ts
git commit -m "Add quote date and readiness to quote creation"
```

---

### Task 8: Invoice Payment Readiness And Webhook Edges

**Files:**
- Modify: `src/app/(app)/invoices/[id]/page.tsx`
- Modify: `src/app/api/invoices/[id]/send/route.ts`
- Modify: `src/app/api/stripe/webhook/route.ts`

**Interfaces:**
- Consumes: `getInvoicePaymentReadiness`, `getWebhookReadiness`
- Produces: structured send response `{ sent, errors, details, paymentLink, paymentLinkState }`

- [ ] **Step 1: Return structured invoice payment-link state**

Modify `src/app/api/invoices/[id]/send/route.ts`:

```ts
let paymentLinkState: "ready" | "created" | "missing_connect" | "stripe_config" | "error" = paymentLink ? "ready" : "missing_connect";
```

Update state in branches:

```ts
if (!paymentLink && !contractor?.stripe_connect_account_id) {
  paymentLinkState = "missing_connect";
}
if (!stripe) {
  paymentLinkState = "stripe_config";
}
...
paymentLinkState = "created";
...
paymentLinkState = "error";
```

Return:

```ts
return NextResponse.json({ sent, errors, details, paymentLink, paymentLinkState }, { status });
```

- [ ] **Step 2: Show invoice readiness in detail page**

Modify `src/app/(app)/invoices/[id]/page.tsx`:

- Import `getInvoicePaymentReadiness`, `ReadinessList`, and `Surface`.
- Fetch env-derived config indirectly is not available client-side, so use send response details for provider errors and default provider configured state to true before send.
- Render readiness from invoice fields.
- After send, if `paymentLinkState` is `missing_connect`, show: `Invoice sent without online payment. Set up Stripe Connect to include a payment link.`

Target readiness call:

```ts
const readiness = invoice ? getInvoicePaymentReadiness({
  client_email: invoice.client_email,
  client_phone: invoice.client_phone,
  total: invoice.total,
  stripe_connect_account_id: invoice.stripe_payment_link ? "connected" : null,
  stripe_payment_link: invoice.stripe_payment_link,
  status: invoice.status,
  amount_paid: invoice.amount_paid,
  paid_at: invoice.paid_at,
  sendgridConfigured: true,
  twilioConfigured: true,
}) : [];
```

- [ ] **Step 3: Harden webhook payment updates**

Modify `src/app/api/stripe/webhook/route.ts` in the `payment_intent.succeeded` case:

```ts
const invoiceId = pi.metadata?.invoice_id;
if (!invoiceId) {
  console.warn("Stripe payment succeeded without invoice_id metadata", { paymentIntentId: pi.id });
  break;
}

const { data: invoice } = await supabase
  .from("invoices")
  .select("id, total")
  .eq("id", invoiceId)
  .maybeSingle();

if (!invoice) {
  console.warn("Stripe payment succeeded for unknown invoice", { paymentIntentId: pi.id, invoiceId });
  break;
}

const amountPaid = pi.amount_received / 100;
await supabase
  .from("invoices")
  .update({
    status: amountPaid >= Number(invoice.total ?? 0) ? "paid" : "sent",
    amount_paid: amountPaid,
    paid_at: new Date().toISOString(),
    stripe_payment_intent_id: pi.id,
  })
  .eq("id", invoice.id);
```

- [ ] **Step 4: Run lint**

Run: `pnpm lint`

Expected: PASS, or fail only on pre-existing unrelated files. Fix invoice/webhook files if needed.

- [ ] **Step 5: Commit**

```powershell
git add -- 'src/app/(app)/invoices/[id]/page.tsx' 'src/app/api/invoices/[id]/send/route.ts' src/app/api/stripe/webhook/route.ts
git commit -m "Represent invoice payment readiness"
```

---

### Task 9: Empty And Missing States

**Files:**
- Modify: `src/components/quotes/quotes-workflow.tsx`
- Modify: `src/app/(app)/invoices/page.tsx`
- Modify: `src/app/(app)/jobs/page.tsx`
- Modify: `src/app/(app)/calendar/page.tsx`
- Modify: `src/app/(app)/clients/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `emptyStateFor`
- Produces: consistent empty-state title/body/action copy

- [ ] **Step 1: Replace quote empty-state copy**

In `src/components/quotes/quotes-workflow.tsx`, import `emptyStateFor`. Use:

```tsx
const empty = filteredQuotes.length === 0 && search.trim() ? emptyStateFor("quote_results") : emptyStateFor("quotes");
```

Render title, body, and action instead of generic bucket-only text.

- [ ] **Step 2: Replace invoices empty state**

In `src/app/(app)/invoices/page.tsx`, use:

```tsx
const empty = emptyStateFor("invoices");
```

Render action link to `empty.href`.

- [ ] **Step 3: Replace jobs and calendar empty states**

In `src/app/(app)/jobs/page.tsx`, use `emptyStateFor("jobs")`.

In `src/app/(app)/calendar/page.tsx`, use `emptyStateFor("calendar_day")` for days without scheduled jobs.

- [ ] **Step 4: Replace clients empty state**

In `src/app/(app)/clients/page.tsx`, use `emptyStateFor("clients")` and link to `/quotes/new`.

- [ ] **Step 5: Add dashboard empty/attention copy**

In `src/app/(app)/dashboard/page.tsx`, ensure no empty panel is blank:

- Active quotes empty uses `emptyStateFor("quotes")`.
- Scheduled work empty uses `emptyStateFor("jobs")`.
- Needs attention empty says: `No urgent risks found. Taskrel will flag missing contact, unpaid invoices, stale quotes, and upcoming work here.`

- [ ] **Step 6: Run lint**

Run: `pnpm lint`

Expected: PASS, or fail only on pre-existing unrelated files. Fix touched empty-state files if needed.

- [ ] **Step 7: Commit**

```powershell
git add -- src/components/quotes/quotes-workflow.tsx 'src/app/(app)/invoices/page.tsx' 'src/app/(app)/jobs/page.tsx' 'src/app/(app)/calendar/page.tsx' 'src/app/(app)/clients/page.tsx' 'src/app/(app)/dashboard/page.tsx'
git commit -m "Unify empty and missing states"
```

---

### Task 10: Final Verification And Visual Pass

**Files:**
- Modify only files needed to fix verification failures from prior tasks.

**Interfaces:**
- Consumes: all prior task outputs
- Produces: verified implementation ready for review

- [ ] **Step 1: Run pure tests**

Run:

```powershell
pnpm exec vitest run src/lib/readiness/setup-readiness.test.ts src/components/quotes/quote-workflow-model.test.ts src/lib/pricing.test.ts src/lib/quote-document.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 4: Start dev server**

Run:

```powershell
pnpm dev
```

Expected: local app starts on `http://localhost:3000` or the next available port.

- [ ] **Step 5: Manual browser verification**

Verify these screens at desktop width and 390px mobile width:

- `/onboarding`: business info, overhead optional/complete, quote documents optional/complete, billing/payment readiness, final start-work action.
- `/settings`: editable business info, hidden Logo URL, quote documents readiness, overhead toggle, billing/export state rows.
- `/settings/billing`: subscription state, payment processing state, webhook state, access code path.
- `/quotes/new`: quote date defaults to today, scheduled work date is separate, readiness panel blocks generation until client name and 20-character scope exist.
- `/quotes`: empty quotes state and search no-results state.
- `/invoices`: no invoices state.
- `/invoices/[id]`: payment link readiness, sent-without-payment-link message, pending webhook payment state, paid webhook state if test data exists.
- `/calendar`: no jobs for selected day state.
- `/clients`: no clients state.

- [ ] **Step 6: Commit final fixes**

If verification required fixes:

```powershell
git add -- <fixed-files>
git commit -m "Polish readiness workflow verification"
```

If no fixes were needed, do not create an empty commit.
