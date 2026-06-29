import { beforeEach, describe, expect, it, vi } from "vitest";

// A flexible Supabase mock: chainable builder, awaitable (thenable), with
// per-table terminal results. The route awaits chains sequentially, so a single
// shared "current table" pointer is safe.
const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  byTable: {} as Record<string, { single?: unknown; await?: unknown }>,
}));

vi.mock("@/lib/supabase/server", () => {
  let current = "";
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "order", "or", "update", "insert"]) {
    builder[m] = () => builder;
  }
  builder.single = () => Promise.resolve(h.byTable[current]?.single ?? { data: null, error: null });
  builder.maybeSingle = () => Promise.resolve(h.byTable[current]?.single ?? { data: null, error: null });
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve(h.byTable[current]?.await ?? { data: null, error: null });
  return {
    createClient: async () => ({
      auth: { getUser: h.getUser },
      from: (table: string) => {
        current = table;
        return builder;
      },
    }),
  };
});

// Not reached on the auth/cooldown paths; mocked so importing the route does
// not pull in Chromium.
vi.mock("@/lib/pdf/generate-quote-pdf", () => ({ renderDocumentPdf: vi.fn() }));
vi.mock("@/lib/documents/archive-document", () => ({
  archiveDocumentPdf: vi.fn(),
  DOCUMENTS_BUCKET: "documents",
}));

import { POST } from "./route";

function req(body: unknown) {
  return {
    json: async () => body,
    nextUrl: { origin: "https://app.test" },
  } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  h.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  h.byTable = {
    contractors: { single: { data: { id: "c-1", business_name: "Acme" }, error: null } },
    quotes: {
      single: {
        data: {
          id: "q-1",
          contractor_id: "c-1",
          client_email: "client@example.com",
          business_snapshot: { renderer_version: "v1" },
          template_preset: "classic",
          public_access_token: "tok-1",
          total: 100,
        },
      },
      await: { error: null }, // public-link update
    },
    delivery_events: { await: { data: [] } },
  };
});

describe("POST /api/quotes/send", () => {
  it("returns 401 when unauthenticated", async () => {
    h.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ quoteId: "q-1", via: ["email"] }));
    expect(res.status).toBe(401);
  });

  it("returns 429 with Retry-After when the same recipient was sent within the cooldown", async () => {
    h.byTable.delivery_events = {
      await: {
        data: [
          { channel: "email", recipient: "client@example.com", created_at: new Date().toISOString() },
        ],
      },
    };
    const res = await POST(req({ quoteId: "q-1", via: ["email"] }));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    const body = await res.json();
    expect(body.sent).toEqual([]);
    expect(body.details[0].code).toBe("rate_limited");
  });
});
