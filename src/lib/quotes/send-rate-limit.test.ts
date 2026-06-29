import { describe, expect, it } from "vitest";
import { SEND_COOLDOWN_MS, evaluateSendCooldown, lastSuccessByRecipient } from "./send-rate-limit";

const now = Date.parse("2026-06-29T12:00:00.000Z");

describe("evaluateSendCooldown", () => {
  it("does not block a channel that has never been sent", () => {
    const blocked = evaluateSendCooldown({
      channels: ["email"],
      lastSuccessByChannel: {},
      now,
    });
    expect(blocked).toEqual([]);
  });

  it("blocks a channel sent within the cooldown window and reports retry-after", () => {
    const lastSuccess = new Date(now - 10 * 60 * 1000).toISOString(); // 10 min ago
    const blocked = evaluateSendCooldown({
      channels: ["email"],
      lastSuccessByChannel: { email: lastSuccess },
      now,
    });
    expect(blocked).toHaveLength(1);
    expect(blocked[0].channel).toBe("email");
    // 60 min cooldown, 10 min elapsed -> ~50 min (3000s) remaining.
    expect(blocked[0].retryAfterSeconds).toBe(50 * 60);
  });

  it("does not block once the cooldown has fully elapsed", () => {
    const lastSuccess = new Date(now - SEND_COOLDOWN_MS).toISOString();
    const blocked = evaluateSendCooldown({
      channels: ["email"],
      lastSuccessByChannel: { email: lastSuccess },
      now,
    });
    expect(blocked).toEqual([]);
  });

  it("only blocks the channels that are on cooldown, not the others requested", () => {
    const recent = new Date(now - 5 * 60 * 1000).toISOString();
    const old = new Date(now - 2 * SEND_COOLDOWN_MS).toISOString();
    const blocked = evaluateSendCooldown({
      channels: ["email", "sms"],
      lastSuccessByChannel: { email: recent, sms: old },
      now,
    });
    expect(blocked.map(b => b.channel)).toEqual(["email"]);
  });

  it("rounds retry-after up to the next whole second", () => {
    const lastSuccess = new Date(now - (SEND_COOLDOWN_MS - 1500)).toISOString();
    const blocked = evaluateSendCooldown({
      channels: ["email"],
      lastSuccessByChannel: { email: lastSuccess },
      now,
    });
    expect(blocked[0].retryAfterSeconds).toBe(2);
  });
});

describe("lastSuccessByRecipient", () => {
  const t1 = "2026-06-29T11:50:00.000Z";
  const t2 = "2026-06-29T11:30:00.000Z";

  it("records a channel only when the event recipient matches the target recipient", () => {
    const result = lastSuccessByRecipient(
      [{ channel: "email", recipient: "a@example.com", created_at: t1 }],
      { email: "a@example.com" },
    );
    expect(result).toEqual({ email: t1 });
  });

  it("ignores a prior send to a DIFFERENT recipient (different email goes through)", () => {
    const result = lastSuccessByRecipient(
      [{ channel: "email", recipient: "old@example.com", created_at: t1 }],
      { email: "new@example.com" },
    );
    expect(result).toEqual({});
  });

  it("keeps the newest matching event (caller orders newest-first)", () => {
    const result = lastSuccessByRecipient(
      [
        { channel: "email", recipient: "a@example.com", created_at: t1 },
        { channel: "email", recipient: "a@example.com", created_at: t2 },
      ],
      { email: "a@example.com" },
    );
    expect(result).toEqual({ email: t1 });
  });

  it("matches per channel independently", () => {
    const result = lastSuccessByRecipient(
      [
        { channel: "email", recipient: "a@example.com", created_at: t1 },
        { channel: "sms", recipient: "+15551234567", created_at: t2 },
      ],
      { email: "a@example.com", sms: "+15551234567" },
    );
    expect(result).toEqual({ email: t1, sms: t2 });
  });

  it("skips a channel with no target recipient", () => {
    const result = lastSuccessByRecipient(
      [{ channel: "email", recipient: "a@example.com", created_at: t1 }],
      { email: null },
    );
    expect(result).toEqual({});
  });
});
