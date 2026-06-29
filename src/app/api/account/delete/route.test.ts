import { beforeEach, describe, expect, it, vi } from "vitest";

// Module-level spies shared with the mocked Supabase/Stripe factories. vi.mock
// is hoisted, so these must be declared via vi.hoisted.
const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  contractorSingle: vi.fn(),
  storageList: vi.fn(),
  storageRemove: vi.fn(),
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  callOrder: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: h.getUser, signOut: h.signOut },
    from: () => ({
      select: () => ({ eq: () => ({ single: h.contractorSingle }) }),
    }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        list: (...args: unknown[]) => {
          h.callOrder.push("storage.list");
          return h.storageList(...args);
        },
        remove: (...args: unknown[]) => {
          h.callOrder.push("storage.remove");
          return h.storageRemove(...args);
        },
      }),
    },
    auth: {
      admin: {
        deleteUser: (...args: unknown[]) => {
          h.callOrder.push("auth.deleteUser");
          return h.deleteUser(...args);
        },
      },
    },
  }),
}));

// Stripe is best-effort and not under test here; no customer -> skipped.
vi.mock("@/lib/stripe", () => ({ getStripe: () => null }));

import { POST } from "./route";

function req(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

const USER = { id: "user-1", email: "owner@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  h.callOrder.length = 0;
  h.getUser.mockResolvedValue({ data: { user: USER } });
  h.contractorSingle.mockResolvedValue({ data: { id: "contractor-1", stripe_customer_id: null } });
  // One stored object per bucket; single page (< LIST_PAGE) ends the walk.
  h.storageList.mockResolvedValue({ data: [{ name: "doc.pdf", id: "obj-1" }], error: null });
  h.storageRemove.mockResolvedValue({ error: null });
  h.deleteUser.mockResolvedValue({ error: null });
  h.signOut.mockResolvedValue({});
});

describe("POST /api/account/delete", () => {
  it("rejects an unauthenticated request with 401", async () => {
    h.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(req({ confirmEmail: "owner@example.com" }));
    expect(res.status).toBe(401);
    expect(h.deleteUser).not.toHaveBeenCalled();
  });

  it("rejects a mismatched confirmation email with 400 and deletes nothing", async () => {
    const res = await POST(req({ confirmEmail: "someone-else@example.com" }));
    expect(res.status).toBe(400);
    expect(h.storageRemove).not.toHaveBeenCalled();
    expect(h.deleteUser).not.toHaveBeenCalled();
  });

  it("purges storage BEFORE deleting the auth user on the happy path", async () => {
    const res = await POST(req({ confirmEmail: "owner@example.com" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(h.storageRemove).toHaveBeenCalled();
    expect(h.deleteUser).toHaveBeenCalledWith("user-1");
    // The destructive invariant: every storage.remove precedes auth.deleteUser.
    const lastRemove = h.callOrder.lastIndexOf("storage.remove");
    const deleteAt = h.callOrder.indexOf("auth.deleteUser");
    expect(lastRemove).toBeGreaterThanOrEqual(0);
    expect(deleteAt).toBeGreaterThan(lastRemove);
  });

  it("aborts BEFORE deleting the auth user when storage purge fails", async () => {
    h.storageRemove.mockResolvedValue({ error: { message: "boom" } });
    const res = await POST(req({ confirmEmail: "owner@example.com" }));
    expect(res.status).toBe(500);
    expect(h.deleteUser).not.toHaveBeenCalled();
  });
});
