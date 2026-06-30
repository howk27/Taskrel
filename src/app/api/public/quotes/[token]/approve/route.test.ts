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
  valid_until: null,
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
  it("redirects to home (303) for unknown token", async () => {
    h.quoteSingle.mockResolvedValue({ data: null });
    const res = await POST(mockRequest(), params("bad-token"));
    expect(res.status).toBe(303);
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

  it("redirects to /q/[token] (303) for expired quote without updating the DB", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    h.quoteSingle.mockResolvedValue({ data: { ...baseQuote, valid_until: yesterday } });
    const res = await POST(mockRequest(), params("tok"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/q/tok");
    expect(h.quoteUpdate).not.toHaveBeenCalled();
  });
});
