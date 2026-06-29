import { describe, expect, it } from "vitest";
import { PDF_COOLDOWN_MS, isPdfOnCooldown } from "./pdf-rate-limit";

const now = Date.parse("2026-06-29T12:00:00.000Z");

describe("isPdfOnCooldown", () => {
  it("allows the first render (no prior timestamp)", () => {
    expect(isPdfOnCooldown(null, now)).toBe(false);
    expect(isPdfOnCooldown(undefined, now)).toBe(false);
  });

  it("blocks a render within the cooldown window", () => {
    const last = new Date(now - 10_000).toISOString();
    expect(isPdfOnCooldown(last, now)).toBe(true);
  });

  it("allows a render once the cooldown window has fully elapsed", () => {
    const last = new Date(now - PDF_COOLDOWN_MS).toISOString();
    expect(isPdfOnCooldown(last, now)).toBe(false);
  });

  it("treats an unparseable timestamp as not on cooldown (fail open, never trap a token)", () => {
    expect(isPdfOnCooldown("not-a-date", now)).toBe(false);
  });

  it("does not block on a future timestamp (clock skew)", () => {
    const future = new Date(now + 5_000).toISOString();
    expect(isPdfOnCooldown(future, now)).toBe(false);
  });
});
