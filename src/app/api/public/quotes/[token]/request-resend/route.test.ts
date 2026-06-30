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
