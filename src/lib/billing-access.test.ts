import { describe, expect, it } from "vitest";
import { buildPremiumAccessCodes, premiumAccessCodeConfigError } from "./billing-access";

describe("premium access helpers", () => {
  it("uses public launch wording for missing access-code configuration", () => {
    expect(premiumAccessCodeConfigError).toBe("Premium access codes are not configured.");
    expect(premiumAccessCodeConfigError.toLowerCase()).not.toContain("closed-test");
    expect(premiumAccessCodeConfigError.toLowerCase()).not.toContain("closed test");
  });

  it("normalizes comma, semicolon, and whitespace separated access codes", () => {
    expect([...buildPremiumAccessCodes(" Friend-Test ; owner-demo\nVIP ")]).toEqual([
      "friend-test",
      "owner-demo",
      "vip",
    ]);
  });
});
