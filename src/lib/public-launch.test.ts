import { describe, expect, it } from "vitest";
import { publicLaunch } from "./public-launch";

describe("publicLaunch", () => {
  it("uses public sale copy instead of closed-test positioning", () => {
    const copy = JSON.stringify(publicLaunch).toLowerCase();

    expect(copy).toContain("$19/month");
    expect(copy).toContain("start free");
    expect(copy).not.toContain("closed test");
    expect(copy).not.toContain("closed-test");
    expect(copy).not.toContain("start testing");
  });

  it("exposes the basic trust links buyers expect before paying", () => {
    expect(publicLaunch.trustLinks).toEqual([
      { href: "/support", label: "Support" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ]);
  });
});
