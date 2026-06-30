# Public Quote Approval Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the public quote approval E2E flow: contractor notification on approval, quote expiry enforcement on the public page with a client resend-request CTA, and approval/expired state improvements on the contractor detail page.

**Architecture:** Six self-contained tasks across three layers — DB migration, API routes (approve, request-resend, send), and two UI pages (public `/q/[token]`, contractor `/quotes/[id]`). Email notifications use the existing SendGrid dynamic-import pattern (best-effort, never blocking). Expiry is derived server-side from `quotes.valid_until`; no new status enum values are needed.

**Tech Stack:** Next.js 15 App Router (Server Components + Route Handlers), Supabase (admin client for public routes), SendGrid, Vitest.

## Global Constraints

- All public routes use `createAdminClient()` from `@/lib/supabase/admin` — never the cookie-based client.
- SendGrid: dynamic import `(await import("@sendgrid/mail")).default`, `setApiKey(process.env.SENDGRID_API_KEY!)`, from `process.env.SENDGRID_FROM_EMAIL!`. Best-effort — wrap in try/catch, never block the main response.
- App domain: `process.env.NEXT_PUBLIC_APP_URL` (falls back to `request.nextUrl.origin` where request is available).
- Email HTML: inline dark-blue shell `background:#08111f` — match `renderPublicQuoteEmailHtml` in `src/lib/public-quote.ts`.
- Run `node_modules/.bin/tsc --noEmit` + `node_modules/.bin/vitest run` after every task. Both must be green before committing.
- Test runner: Vitest (`node_modules/.bin/vitest run`). Tests live next to the files they test or in the same directory as the route.
- Never use `git add -A`. Stage only the files changed in that task.

---

## Task 1: DB migration — `last_resend_requested_at`

**Files:**
- Create: `supabase/migrations/013_quote_resend_requested.sql`

**Interfaces:**
- Produces: `quotes.last_resend_requested_at timestamptz` column, readable in Task 4 route.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/013_quote_resend_requested.sql`:

```sql
-- ============================================================================
-- Taskrel - Client resend-request rate limit
-- Migration: 013_quote_resend_requested.sql
--
-- The unauthenticated /api/public/quotes/[token]/request-resend route lets a
-- client notify the contractor that they want a new quote when one has expired.
-- This column backs a 1-hour per-quote cooldown so a client cannot spam the
-- contractor with notifications.
-- See src/app/api/public/quotes/[token]/request-resend/route.ts
-- ============================================================================

alter table public.quotes
  add column if not exists last_resend_requested_at timestamptz;

comment on column public.quotes.last_resend_requested_at is
  'Timestamp of the most recent client resend-request notification; backs the 1-hour per-quote cooldown.';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/013_quote_resend_requested.sql
git commit -m "feat: add last_resend_requested_at column migration"
```

> **Founder action required:** Apply this migration to production via Supabase dashboard or CLI before deploying Tasks 3 and 4.

---

## Task 2: Email notification helpers in `public-quote.ts`

**Files:**
- Modify: `src/lib/public-quote.ts`
- Modify: `src/lib/public-quote.test.ts`

**Interfaces:**
- Produces:
  - `renderApprovalNotificationHtml({ clientName, quoteUrl }: { clientName: string; quoteUrl: string }): string`
  - `renderResendRequestHtml({ clientName, clientAddress, quoteUrl }: { clientName: string; clientAddress: string | null; quoteUrl: string }): string`

- [ ] **Step 1: Write failing tests**

Add to `src/lib/public-quote.test.ts` (append after existing tests):

```ts
import { renderApprovalNotificationHtml, renderResendRequestHtml } from "./public-quote";

describe("renderApprovalNotificationHtml", () => {
  it("contains the client name and quote URL", () => {
    const html = renderApprovalNotificationHtml({
      clientName: "Jane Doe",
      quoteUrl: "https://app.example.com/quotes/abc",
    });
    expect(html).toContain("Jane Doe");
    expect(html).toContain("https://app.example.com/quotes/abc");
  });

  it("escapes HTML in client name", () => {
    const html = renderApprovalNotificationHtml({
      clientName: '<script>alert("xss")</script>',
      quoteUrl: "https://app.example.com/quotes/abc",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderResendRequestHtml", () => {
  it("contains the client name and quote URL", () => {
    const html = renderResendRequestHtml({
      clientName: "John Smith",
      clientAddress: "123 Main St",
      quoteUrl: "https://app.example.com/quotes/abc",
    });
    expect(html).toContain("John Smith");
    expect(html).toContain("123 Main St");
    expect(html).toContain("https://app.example.com/quotes/abc");
  });

  it("omits address line when clientAddress is null", () => {
    const html = renderResendRequestHtml({
      clientName: "John Smith",
      clientAddress: null,
      quoteUrl: "https://app.example.com/quotes/abc",
    });
    expect(html).not.toContain("null");
    expect(html).toContain("John Smith");
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node_modules/.bin/vitest run src/lib/public-quote.test.ts
```

Expected: FAIL — `renderApprovalNotificationHtml is not a function` (or similar).

- [ ] **Step 3: Implement helpers in `src/lib/public-quote.ts`**

Append to the end of the file (after `canApprovePublicQuoteStatus`):

```ts
export function renderApprovalNotificationHtml({
  clientName,
  quoteUrl,
}: {
  clientName: string;
  quoteUrl: string;
}) {
  const safeName = escapeHtml(clientName);
  const safeUrl = escapeHtml(quoteUrl);
  return `
    <div style="margin:0;padding:0;background:#08111f;">
      <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Aptos,Arial,sans-serif;">
        <div style="border:1px solid rgba(148,163,184,.24);border-radius:8px;background:#0d1726;padding:18px;color:#f8fafc;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;line-height:1.2;font-weight:800;">Quote approved</h1>
          <p style="margin:10px 0 0;color:#cbd5e1;font-size:14px;line-height:1.6;">${safeName} approved your quote and is ready to move forward.</p>
          <a href="${safeUrl}" style="display:inline-block;margin-top:16px;border-radius:8px;background:#fb923c;color:#08111f;padding:12px 16px;text-decoration:none;font-size:14px;font-weight:800;">View quote</a>
        </div>
        <p style="margin:18px 0 0;text-align:center;color:#94a3b8;font-size:13px;">If the button does not open, copy this link: <a href="${safeUrl}" style="color:#fb923c;">${safeUrl}</a></p>
      </div>
    </div>
  `;
}

export function renderResendRequestHtml({
  clientName,
  clientAddress,
  quoteUrl,
}: {
  clientName: string;
  clientAddress: string | null;
  quoteUrl: string;
}) {
  const safeName = escapeHtml(clientName);
  const safeUrl = escapeHtml(quoteUrl);
  const addressLine = clientAddress
    ? `<p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">${escapeHtml(clientAddress)}</p>`
    : "";
  return `
    <div style="margin:0;padding:0;background:#08111f;">
      <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Aptos,Arial,sans-serif;">
        <div style="border:1px solid rgba(148,163,184,.24);border-radius:8px;background:#0d1726;padding:18px;color:#f8fafc;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;line-height:1.2;font-weight:800;">Resend requested</h1>
          <p style="margin:10px 0 0;color:#cbd5e1;font-size:14px;line-height:1.6;">${safeName} is requesting a new quote — their previous one has expired.</p>
          ${addressLine}
          <a href="${safeUrl}" style="display:inline-block;margin-top:16px;border-radius:8px;background:#fb923c;color:#08111f;padding:12px 16px;text-decoration:none;font-size:14px;font-weight:800;">View quote</a>
        </div>
        <p style="margin:18px 0 0;text-align:center;color:#94a3b8;font-size:13px;">If the button does not open, copy this link: <a href="${safeUrl}" style="color:#fb923c;">${safeUrl}</a></p>
      </div>
    </div>
  `;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
node_modules/.bin/vitest run src/lib/public-quote.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/public-quote.ts src/lib/public-quote.test.ts
git commit -m "feat: add approval and resend-request email HTML helpers"
```

---

## Task 3: Contractor notification on quote approval

**Files:**
- Modify: `src/app/api/public/quotes/[token]/approve/route.ts`
- Create: `src/app/api/public/quotes/[token]/approve/route.test.ts`

**Interfaces:**
- Consumes: `renderApprovalNotificationHtml` from `@/lib/public-quote` (Task 2)
- Consumes: `canApprovePublicQuoteStatus` from `@/lib/public-quote` (existing)

- [ ] **Step 1: Write failing tests**

Create `src/app/api/public/quotes/[token]/approve/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  quoteSingle: vi.fn(),
  quoteUpdate: vi.fn(),
  sgSend: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "quotes") {
        return {
          select: () => ({ eq: () => ({ single: h.quoteSingle }) }),
          update: () => ({ eq: () => ({ eq: h.quoteUpdate }) }),
        };
      }
      return {};
    },
  }),
}));

vi.mock("@sendgrid/mail", () => ({
  default: { setApiKey: vi.fn(), send: (...args: unknown[]) => h.sgSend(...args) },
}));

vi.mock("@/lib/public-quote", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/public-quote")>();
  return { ...actual };
});

import { POST } from "./route";

const mockRequest = (url = "https://app.example.com") =>
  ({ url, nextUrl: new URL(url) }) as never;

const params = (token: string) => ({ params: Promise.resolve({ token }) });

const baseQuote = {
  id: "quote-1",
  status: "sent",
  client_name: "Jane Doe",
  contractor_id: "ctr-1",
  contractors: { email: "contractor@example.com", business_name: "Acme Co" },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SENDGRID_API_KEY = "SG.test";
  process.env.SENDGRID_FROM_EMAIL = "noreply@taskrel.com";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  h.quoteUpdate.mockResolvedValue({ error: null });
  h.sgSend.mockResolvedValue([{ statusCode: 202 }]);
});

describe("POST /api/public/quotes/[token]/approve", () => {
  it("redirects to home for unknown token", async () => {
    h.quoteSingle.mockResolvedValue({ data: null });
    const res = await POST(mockRequest(), params("bad-token"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/");
  });

  it("updates status to approved and redirects with ?approved=1", async () => {
    h.quoteSingle.mockResolvedValue({ data: { ...baseQuote } });
    const res = await POST(mockRequest(), params("tok"));
    expect(h.quoteUpdate).toHaveBeenCalled();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("approved=1");
  });

  it("sends contractor notification email on approval", async () => {
    h.quoteSingle.mockResolvedValue({ data: { ...baseQuote } });
    await POST(mockRequest(), params("tok"));
    expect(h.sgSend).toHaveBeenCalledTimes(1);
    const call = h.sgSend.mock.calls[0][0];
    expect(call.to).toBe("contractor@example.com");
    expect(call.subject).toContain("Jane Doe");
  });

  it("does not block redirect if SendGrid throws", async () => {
    h.quoteSingle.mockResolvedValue({ data: { ...baseQuote } });
    h.sgSend.mockRejectedValue(new Error("SG down"));
    const res = await POST(mockRequest(), params("tok"));
    expect(res.status).toBe(303);
  });

  it("skips notification for already-approved quotes", async () => {
    h.quoteSingle.mockResolvedValue({ data: { ...baseQuote, status: "approved" } });
    await POST(mockRequest(), params("tok"));
    expect(h.sgSend).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node_modules/.bin/vitest run src/app/api/public/quotes/\\[token\\]/approve/route.test.ts
```

Expected: FAIL — tests that check `h.sgSend` fail because the route doesn't send email yet.

- [ ] **Step 3: Update the approve route**

Replace `src/app/api/public/quotes/[token]/approve/route.ts` in full:

```ts
import { NextRequest, NextResponse } from "next/server";
import { canApprovePublicQuoteStatus, renderApprovalNotificationHtml } from "@/lib/public-quote";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status, client_name, contractor_id, contractors(email, business_name)")
    .eq("public_access_token", token)
    .single<{
      id: string;
      status: string;
      client_name: string;
      contractor_id: string;
      contractors: { email: string; business_name: string } | null;
    }>();

  if (!quote) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!canApprovePublicQuoteStatus(quote.status)) {
    return NextResponse.redirect(new URL(`/q/${token}`, request.url));
  }

  const alreadyApproved = quote.status === "approved";

  if (!alreadyApproved) {
    await supabase
      .from("quotes")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", quote.id)
      .eq("contractor_id", quote.contractor_id);

    // Best-effort contractor notification
    if (quote.contractors?.email) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
        const quoteUrl = `${appUrl}/quotes/${quote.id}`;
        const sgMail = (await import("@sendgrid/mail")).default;
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
        await sgMail.send({
          to: quote.contractors.email,
          from: process.env.SENDGRID_FROM_EMAIL!,
          subject: `Quote approved by ${quote.client_name}`,
          html: renderApprovalNotificationHtml({
            clientName: quote.client_name,
            quoteUrl,
          }),
        });
      } catch (err) {
        console.error("Approval notification failed", {
          quoteId: quote.id,
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  return NextResponse.redirect(new URL(`/q/${token}?approved=1`, request.url), { status: 303 });
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
node_modules/.bin/vitest run src/app/api/public/quotes/\\[token\\]/approve/route.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Full suite + type-check**

```bash
node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run
```

Expected: tsc clean, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/public/quotes/\[token\]/approve/route.ts src/app/api/public/quotes/\[token\]/approve/route.test.ts
git commit -m "feat: send contractor notification email on quote approval"
```

---

## Task 4: Request-resend route

**Files:**
- Create: `src/app/api/public/quotes/[token]/request-resend/route.ts`
- Create: `src/app/api/public/quotes/[token]/request-resend/route.test.ts`

**Interfaces:**
- Consumes: `renderResendRequestHtml` from `@/lib/public-quote` (Task 2)
- Produces: `POST /api/public/quotes/[token]/request-resend`
  - 303 → `/q/[token]?resend_requested=1` on success
  - 303 → `/q/[token]?resend_throttled=1` when within 1-hour cooldown

- [ ] **Step 1: Write failing tests**

Create `src/app/api/public/quotes/[token]/request-resend/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

const h = vi.hoisted(() => ({
  quoteSingle: vi.fn(),
  quoteUpdate: vi.fn(),
  sgSend: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: h.quoteSingle }) }),
      update: () => ({ eq: () => ({ eq: h.quoteUpdate }) }),
    }),
  }),
}));

vi.mock("@sendgrid/mail", () => ({
  default: { setApiKey: vi.fn(), send: (...args: unknown[]) => h.sgSend(...args) },
}));

import { POST } from "./route";

const mockRequest = (url = "https://app.example.com") =>
  ({ url, nextUrl: new URL(url) }) as never;

const params = (token: string) => ({ params: Promise.resolve({ token }) });

const baseQuote = {
  id: "quote-1",
  client_name: "John Smith",
  client_address: "123 Main St",
  last_resend_requested_at: null as string | null,
  contractors: { email: "contractor@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SENDGRID_API_KEY = "SG.test";
  process.env.SENDGRID_FROM_EMAIL = "noreply@taskrel.com";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  h.quoteUpdate.mockResolvedValue({ error: null });
  h.sgSend.mockResolvedValue([{ statusCode: 202 }]);
});

describe("POST /api/public/quotes/[token]/request-resend", () => {
  it("returns 303 → home for unknown token", async () => {
    h.quoteSingle.mockResolvedValue({ data: null });
    const res = await POST(mockRequest(), params("bad"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/\/$/);
  });

  it("throttles if last request was within 1 hour", async () => {
    const recentRequest = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
    h.quoteSingle.mockResolvedValue({
      data: { ...baseQuote, last_resend_requested_at: recentRequest },
    });
    const res = await POST(mockRequest(), params("tok"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("resend_throttled=1");
    expect(h.sgSend).not.toHaveBeenCalled();
  });

  it("sends notification and redirects with resend_requested=1 when not throttled", async () => {
    h.quoteSingle.mockResolvedValue({ data: { ...baseQuote } });
    const res = await POST(mockRequest(), params("tok"));
    expect(h.sgSend).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("resend_requested=1");
  });

  it("updates last_resend_requested_at on success", async () => {
    h.quoteSingle.mockResolvedValue({ data: { ...baseQuote } });
    await POST(mockRequest(), params("tok"));
    expect(h.quoteUpdate).toHaveBeenCalled();
  });

  it("proceeds even if SendGrid throws", async () => {
    h.quoteSingle.mockResolvedValue({ data: { ...baseQuote } });
    h.sgSend.mockRejectedValue(new Error("SG down"));
    const res = await POST(mockRequest(), params("tok"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("resend_requested=1");
  });

  it("allows request after cooldown has passed", async () => {
    const oldRequest = new Date(Date.now() - COOLDOWN_MS - 1000).toISOString();
    h.quoteSingle.mockResolvedValue({
      data: { ...baseQuote, last_resend_requested_at: oldRequest },
    });
    const res = await POST(mockRequest(), params("tok"));
    expect(h.sgSend).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("resend_requested=1");
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node_modules/.bin/vitest run src/app/api/public/quotes/\\[token\\]/request-resend/route.test.ts
```

Expected: FAIL — route file does not exist.

- [ ] **Step 3: Implement the route**

Create `src/app/api/public/quotes/[token]/request-resend/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderResendRequestHtml } from "@/lib/public-quote";

const RESEND_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, client_name, client_address, last_resend_requested_at, contractors(email)")
    .eq("public_access_token", token)
    .single<{
      id: string;
      client_name: string;
      client_address: string | null;
      last_resend_requested_at: string | null;
      contractors: { email: string } | null;
    }>();

  if (!quote) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  // Rate-limit: 1 request per hour per quote
  if (quote.last_resend_requested_at) {
    const elapsed = Date.now() - Date.parse(quote.last_resend_requested_at);
    if (elapsed >= 0 && elapsed < RESEND_COOLDOWN_MS) {
      return NextResponse.redirect(new URL(`/q/${token}?resend_throttled=1`, request.url), { status: 303 });
    }
  }

  // Claim the slot before sending so concurrent requests see it immediately
  await supabase
    .from("quotes")
    .update({ last_resend_requested_at: new Date().toISOString() })
    .eq("id", quote.id)
    .eq("public_access_token", token);

  // Best-effort notification to contractor
  if (quote.contractors?.email) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
      const quoteUrl = `${appUrl}/quotes/${quote.id}`;
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      await sgMail.send({
        to: quote.contractors.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `${quote.client_name} is requesting a new quote`,
        html: renderResendRequestHtml({
          clientName: quote.client_name,
          clientAddress: quote.client_address,
          quoteUrl,
        }),
      });
    } catch (err) {
      console.error("Resend request notification failed", {
        quoteId: quote.id,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.redirect(new URL(`/q/${token}?resend_requested=1`, request.url), { status: 303 });
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
node_modules/.bin/vitest run src/app/api/public/quotes/\\[token\\]/request-resend/route.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Full suite + type-check**

```bash
node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run
```

Expected: tsc clean, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/public/quotes/\[token\]/request-resend/route.ts src/app/api/public/quotes/\[token\]/request-resend/route.test.ts
git commit -m "feat: add rate-limited request-resend route with contractor notification"
```

---

## Task 5: Public quote page — expiry states and resend CTA

**Files:**
- Modify: `src/app/q/[token]/page.tsx`

**Interfaces:**
- Consumes: `POST /api/public/quotes/[token]/request-resend` (Task 4)
- No new exports — this is a Server Component.

- [ ] **Step 1: Update `src/app/q/[token]/page.tsx`**

Replace the file in full (the only changes are: add `valid_until` to the select, derive `isExpired`, and replace the CTA area with three conditional branches):

```tsx
import { notFound } from "next/navigation";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderQuoteDocumentHtml } from "@/lib/quote-document";
import type { BusinessSnapshot, Quote, QuoteTemplatePreset } from "@/types";

export const dynamic = "force-dynamic";

type PublicQuoteRow = Pick<
  Quote,
  | "id"
  | "client_name"
  | "client_address"
  | "client_email"
  | "client_phone"
  | "line_items"
  | "subtotal"
  | "tax_rate"
  | "tax_amount"
  | "total"
  | "notes"
  | "scheduled_start"
  | "scheduled_end"
  | "created_at"
  | "status"
  | "business_snapshot"
  | "template_preset"
  | "approved_at"
  | "valid_until"
>;

function numberValue(value: number | string | null) {
  return Number(value ?? 0);
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function PublicQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ approved?: string; resend_requested?: string; resend_throttled?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = createAdminClient();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, client_name, client_address, client_email, client_phone, line_items, subtotal, tax_rate, tax_amount, total, notes, scheduled_start, scheduled_end, created_at, status, business_snapshot, template_preset, approved_at, valid_until")
    .eq("public_access_token", token)
    .single<PublicQuoteRow>();

  if (error || !quote || !quote.business_snapshot) notFound();

  const approved = quote.status === "approved";
  const isExpired =
    !approved &&
    quote.valid_until !== null &&
    new Date() > new Date(quote.valid_until);

  const quoteHtml = renderQuoteDocumentHtml({
    quote: {
      ...quote,
      subtotal: numberValue(quote.subtotal),
      tax_rate: numberValue(quote.tax_rate),
      tax_amount: numberValue(quote.tax_amount),
      total: numberValue(quote.total),
    },
    business: quote.business_snapshot as BusinessSnapshot,
    preset: (quote.template_preset ?? "classic") as QuoteTemplatePreset,
  });

  return (
    <main className="min-h-screen bg-[var(--tr-bg)] px-4 py-5 text-[var(--tr-text)] md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-5 flex items-center justify-between gap-4">
          <TaskrelWordmark size="sm" />
          <span
            className={`rounded-md px-2.5 py-1 text-sm font-semibold ${
              approved
                ? "bg-[var(--tr-badge-success-bg)] text-[var(--tr-badge-success-text)] ring-1 ring-[var(--tr-badge-success-ring)]"
                : isExpired
                  ? "bg-[var(--tr-badge-warning-bg)] text-[var(--tr-badge-warning-text)] ring-1 ring-[var(--tr-badge-warning-ring)]"
                  : "bg-[var(--tr-badge-info-bg)] text-[var(--tr-badge-info-text)] ring-1 ring-[var(--tr-badge-info-ring)]"
            }`}
          >
            {approved ? "Approved" : isExpired ? "Expired" : "Ready to review"}
          </span>
        </nav>

        <section className="mb-5 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5">
          <div className="mt-2 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--tr-text)] md:text-3xl">
                Quote for {quote.client_name}
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--tr-text-muted)]">
                {approved
                  ? "This quote has been approved."
                  : isExpired
                    ? "This quote has expired."
                    : "Review the scope and total below. Approving tells the contractor you are ready to move forward."}
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-sm font-medium text-[var(--tr-text-muted)]">Total</p>
              <p className="text-3xl font-semibold text-[var(--tr-text)]">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                  numberValue(quote.total),
                )}
              </p>
            </div>
          </div>

          {/* Status banners */}
          {query?.approved === "1" && (
            <p className="mt-4 rounded-lg bg-[var(--tr-success-bg)] p-3 text-sm font-semibold text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
              Quote approved. The contractor can now convert it into an invoice.
            </p>
          )}
          {query?.resend_requested === "1" && (
            <p className="mt-4 rounded-lg bg-[var(--tr-success-bg)] p-3 text-sm font-semibold text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
              Resend requested. The contractor will be in touch.
            </p>
          )}
          {query?.resend_throttled === "1" && (
            <p className="mt-4 rounded-lg bg-[var(--tr-warning-bg)] p-3 text-sm font-semibold text-[var(--tr-amber)] shadow-[inset_0_0_0_1px_var(--tr-badge-warning-ring)]">
              Request already sent. Please wait before requesting again.
            </p>
          )}

          {/* CTA area */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            {approved ? (
              <p className="rounded-lg bg-[var(--tr-success-bg)] p-3 text-sm font-semibold text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
                This quote has been approved{quote.approved_at ? ` on ${formatShortDate(quote.approved_at)}` : ""}.
              </p>
            ) : isExpired ? (
              <>
                <p className="text-sm font-semibold text-[var(--tr-amber)]">
                  Quote expired {quote.valid_until ? formatShortDate(quote.valid_until) : ""}.
                </p>
                <form action={`/api/public/quotes/${token}/request-resend`} method="post">
                  <button
                    type="submit"
                    className="tr-primary-action inline-flex h-12 w-full items-center justify-center rounded-lg px-5 text-sm font-semibold sm:w-auto"
                  >
                    Request resend
                  </button>
                </form>
              </>
            ) : (
              <form action={`/api/public/quotes/${token}/approve`} method="post">
                <button
                  type="submit"
                  className="tr-primary-action inline-flex h-12 w-full items-center justify-center rounded-lg px-5 text-sm font-semibold sm:w-auto"
                >
                  Approve quote
                </button>
              </form>
            )}
            <a
              href={`/api/public/quotes/${token}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[var(--tr-border-soft)] px-5 text-sm font-semibold text-[var(--tr-text)] hover:bg-[var(--tr-bg-soft)] sm:w-auto"
            >
              Download PDF
            </a>
          </div>
        </section>

        <div className="overflow-hidden rounded-lg">
          <div dangerouslySetInnerHTML={{ __html: quoteHtml }} />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Type-check + full test suite**

```bash
node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run
```

Expected: tsc clean, all tests pass (no test file for this Server Component — expiry logic is simple branching on a date comparison, not worth a unit test separate from E2E).

- [ ] **Step 3: Commit**

```bash
git add "src/app/q/[token]/page.tsx"
git commit -m "feat: enforce quote expiry on public page with resend CTA"
```

---

## Task 6: Send route — skip cooldown on expired + reset `valid_until`

**Files:**
- Modify: `src/app/api/quotes/send/route.ts`
- Modify: `src/app/api/quotes/send/route.test.ts`

**Interfaces:**
- Consumes: `quotes.valid_until` (already selected via `select("*")`)
- Produces: expired quotes skip `evaluateSendCooldown`; `valid_until` reset to +30 days on send.

- [ ] **Step 1: Write failing tests**

The existing test file (`src/app/api/quotes/send/route.test.ts`) uses a table-keyed mock: `h.byTable["quotes"].single.data` is the quote row, `h.byTable["delivery_events"].await.data` is the events array. The request helper is `req(body)`. Add these two tests inside the existing `describe("POST /api/quotes/send", ...)` block (before the final `}`):

```ts
it("skips cooldown when quote valid_until is in the past", async () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  h.byTable.quotes = {
    single: {
      data: {
        id: "q-1",
        contractor_id: "c-1",
        client_email: "client@example.com",
        business_snapshot: { renderer_version: "v1" },
        template_preset: "classic",
        public_access_token: "tok-1",
        total: 100,
        valid_until: yesterday,
      },
    },
    await: { error: null },
  };
  // A recent successful send that would normally trigger a 429
  h.byTable.delivery_events = {
    await: {
      data: [
        {
          channel: "email",
          recipient: "client@example.com",
          status: "success",
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      ],
    },
  };
  const sgMail = await import("@sendgrid/mail");
  vi.spyOn(sgMail.default, "send").mockResolvedValue([{ statusCode: 202 }] as never);
  vi.spyOn(sgMail.default, "setApiKey").mockImplementation(() => undefined);
  process.env.SENDGRID_API_KEY = "SG.test";
  process.env.SENDGRID_FROM_EMAIL = "noreply@taskrel.com";
  const res = await POST(req({ quoteId: "q-1", via: ["email"] }));
  // Expired quote bypasses cooldown — should NOT be 429
  expect(res.status).not.toBe(429);
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
node_modules/.bin/vitest run src/app/api/quotes/send/route.test.ts
```

Expected: the two new tests FAIL.

- [ ] **Step 3: Update the send route**

In `src/app/api/quotes/send/route.ts`, make two targeted changes:

**Change A** — after the line that reads `const blockedChannels = evaluateSendCooldown(...)`, wrap it in an expiry check. Find this block (around line 112-120):

```ts
  const blockedChannels = evaluateSendCooldown({ channels: consideredChannels, lastSuccessByChannel });
```

Replace with:

```ts
  const quoteIsExpired =
    quote.valid_until !== null &&
    quote.valid_until !== undefined &&
    new Date() > new Date(quote.valid_until as string);

  const blockedChannels = quoteIsExpired
    ? [] // expired quotes bypass the cooldown — contractor is resending deliberately
    : evaluateSendCooldown({ channels: consideredChannels, lastSuccessByChannel });
```

**Change B** — in the pre-send `quotes.update` block (the one that sets `business_snapshot`, `template_preset`, `public_access_token`), add `valid_until` when the quote is expired. Find this update block (around line 70-78):

```ts
  const { error: publicLinkError } = await supabase
    .from("quotes")
    .update({
      business_snapshot: businessSnapshot,
      template_preset: templatePreset,
      public_access_token: publicAccessToken,
    })
    .eq("id", quoteId)
    .eq("contractor_id", quoteContractor.id);
```

Replace with:

```ts
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: publicLinkError } = await supabase
    .from("quotes")
    .update({
      business_snapshot: businessSnapshot,
      template_preset: templatePreset,
      public_access_token: publicAccessToken,
      ...(quoteIsExpired ? { valid_until: thirtyDaysFromNow } : {}),
    })
    .eq("id", quoteId)
    .eq("contractor_id", quoteContractor.id);
```

> **Placement:** Declare `quoteIsExpired` immediately after the quote is fetched (around line 58, right after the `if (!quote)` guard). The route uses `select("*")` so `valid_until` is already in the result. It must be declared before both the pre-send update (which uses it to conditionally add `valid_until`) and the cooldown check (which uses it to skip `evaluateSendCooldown`).

- [ ] **Step 4: Run tests — expect pass**

```bash
node_modules/.bin/vitest run src/app/api/quotes/send/route.test.ts
```

Expected: all tests pass including the two new ones.

- [ ] **Step 5: Full suite + type-check**

```bash
node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run
```

Expected: tsc clean, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/quotes/send/route.ts src/app/api/quotes/send/route.test.ts
git commit -m "feat: skip send cooldown and reset valid_until when resending expired quote"
```

---

## Task 7: Contractor quote detail page — approval banner + expired state

**Files:**
- Modify: `src/app/(app)/quotes/[id]/page.tsx`

**Interfaces:**
- Consumes: `quote.approved_at`, `quote.valid_until`, `quote.client_name` (all already in Quote type and returned by `/api/quotes/[id]`)
- No new exports.

- [ ] **Step 1: Add approval banner**

In `src/app/(app)/quotes/[id]/page.tsx`, find the action button group inside `ActionRail`. The "Create Invoice" button is rendered when status is "approved":

```tsx
{["draft", "sent", "approved"].includes(quote.status) && (
  <Button className="w-full" onClick={handleConvertToInvoice} loading={converting} disabled={dirty}>
    <Receipt size={18} weight="duotone" />
    {quote.status === "approved" ? "Create Invoice" : "Approve & Convert"}
  </Button>
)}
```

Add the approval banner immediately BEFORE this block:

```tsx
{quote.status === "approved" && quote.approved_at && (
  <p className="rounded-lg bg-[var(--tr-success-bg)] p-3 text-sm font-semibold text-[var(--tr-green)] shadow-[inset_0_0_0_1px_var(--tr-badge-success-ring)]">
    Approved by {quote.client_name} on {formatDate(quote.approved_at)}.
  </p>
)}
```

- [ ] **Step 2: Add expired badge label**

The page renders the status badge as:
```tsx
<Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
```

`statusVariant` already maps `"expired"` to `"warning"`, but the status value on the DB row is always `"sent"` — the quote never changes status to "expired". We derive it visually. Replace the badge line with:

```tsx
{(() => {
  const isExpired =
    quote.status === "sent" &&
    quote.valid_until !== null &&
    new Date() > new Date(quote.valid_until);
  return (
    <Badge variant={isExpired ? "warning" : statusVariant(quote.status)}>
      {isExpired ? "Expired" : quote.status}
    </Badge>
  );
})()}
```

- [ ] **Step 3: Show Resend button for expired quotes without cooldown**

The existing "Resend Quote" button for `status === "sent"` calls `handleSend(sendVia)`. The send route already skips cooldown for expired quotes (Task 6), so the UI just needs to label it "Resend" instead of "Resend Quote" when expired. Also add a short note so the contractor knows valid_until will reset.

Find the existing "Resend Quote" button block:

```tsx
{quote.status === "sent" && (
  <Button variant="secondary" className="w-full" onClick={() => handleSend(sendVia)} loading={sending} disabled={dirty || sendVia.length === 0}>
    <EnvelopeSimple size={18} weight="duotone" />
    Resend Quote
  </Button>
)}
```

Replace with:

```tsx
{quote.status === "sent" && (() => {
  const isExpired =
    quote.valid_until !== null &&
    new Date() > new Date(quote.valid_until);
  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => handleSend(sendVia)} loading={sending} disabled={dirty || sendVia.length === 0}>
        <EnvelopeSimple size={18} weight="duotone" />
        {isExpired ? "Resend" : "Resend Quote"}
      </Button>
      {isExpired && (
        <p className="text-sm text-[var(--tr-text-muted)]">
          Quote expired — resending resets the expiry 30 days.
        </p>
      )}
    </>
  );
})()}
```

- [ ] **Step 4: Type-check + full test suite**

```bash
node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run
```

Expected: tsc clean, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/quotes/[id]/page.tsx"
git commit -m "feat: show approval banner and expired state on contractor quote detail"
```

---

## Completion checklist

- [ ] Migration `013` applied to production (founder action)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — all tests pass (count should be 143 + new tests)
- [ ] Manual smoke test: send a quote with `valid_until` in the past, open `/q/[token]`, verify expired state + resend CTA
- [ ] Manual smoke test: approve a quote as client, verify contractor receives notification email
- [ ] Manual smoke test: resend an expired quote from contractor detail, verify `valid_until` resets and cooldown is bypassed
