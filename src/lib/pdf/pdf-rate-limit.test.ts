import { describe, expect, it } from "vitest";
import { checkPdfCooldown } from "./pdf-rate-limit";

describe("checkPdfCooldown", () => {
  it("allows the first hit and blocks a rapid repeat", () => {
    const token = `tok-${Math.random()}`;
    expect(checkPdfCooldown(token, 1_000)).toBe(false);
    expect(checkPdfCooldown(token, 5_000)).toBe(true);
  });

  it("allows again once the cooldown window has elapsed", () => {
    const token = `tok-${Math.random()}`;
    expect(checkPdfCooldown(token, 1_000)).toBe(false);
    expect(checkPdfCooldown(token, 1_000 + 60_000)).toBe(false);
  });

  it("tracks tokens independently", () => {
    const a = `tok-a-${Math.random()}`;
    const b = `tok-b-${Math.random()}`;
    expect(checkPdfCooldown(a, 1_000)).toBe(false);
    expect(checkPdfCooldown(b, 1_000)).toBe(false);
    expect(checkPdfCooldown(a, 1_500)).toBe(true);
  });
});
