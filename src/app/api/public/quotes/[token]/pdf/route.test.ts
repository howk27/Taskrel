import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  quoteSingle: vi.fn(),
  quoteUpdateEq: vi.fn(),
  renderPdf: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      // read: .select(...).eq(...).single()
      select: () => ({ eq: () => ({ single: h.quoteSingle }) }),
      // write: .update(...).eq(...)
      update: () => ({ eq: h.quoteUpdateEq }),
    }),
  }),
}));

vi.mock("@/lib/quote-document", () => ({
  renderQuoteDocumentHtml: () => "<div>quote</div>",
}));

vi.mock("@/lib/pdf/generate-quote-pdf", () => ({
  renderDocumentPdf: (...args: unknown[]) => h.renderPdf(...args),
}));

import { GET } from "./route";

const params = (token: string) => ({ params: Promise.resolve({ token }) });
const baseQuote = {
  id: "quote-1",
  business_snapshot: { renderer_version: "v1" },
  template_preset: "classic",
  line_items: [],
  subtotal: 0,
  tax_rate: 0,
  tax_amount: 0,
  total: 0,
  last_pdf_generated_at: null as string | null,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.quoteUpdateEq.mockResolvedValue({ error: null });
  h.renderPdf.mockResolvedValue(Buffer.from("%PDF-1.4 test"));
});

describe("GET /api/public/quotes/[token]/pdf", () => {
  it("returns 404 for an unknown token", async () => {
    h.quoteSingle.mockResolvedValue({ data: null });
    const res = await GET({} as never, params("nope"));
    expect(res.status).toBe(404);
    expect(h.renderPdf).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when the quote is within the cooldown window", async () => {
    h.quoteSingle.mockResolvedValue({
      data: { ...baseQuote, last_pdf_generated_at: new Date().toISOString() },
    });
    const res = await GET({} as never, params("tok"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(h.renderPdf).not.toHaveBeenCalled();
  });

  it("claims the cooldown slot and renders a PDF when not on cooldown", async () => {
    h.quoteSingle.mockResolvedValue({ data: { ...baseQuote, last_pdf_generated_at: null } });
    const res = await GET({} as never, params("tok"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    // The slot is claimed (timestamp written) before rendering.
    expect(h.quoteUpdateEq).toHaveBeenCalled();
    expect(h.renderPdf).toHaveBeenCalledTimes(1);
  });
});
