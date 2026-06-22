import { describe, expect, it } from "vitest";

import { getSettingsBillingReadiness } from "./billing-summary";

describe("getSettingsBillingReadiness", () => {
  it("returns compact readiness items for subscription and payment processing", () => {
    expect(
      getSettingsBillingReadiness({
        subscription_status: null,
        stripe_connect_account_id: null,
        billingConfigured: true,
        connectConfigured: true,
      }).map(item => [item.key, item.state, item.actionLabel ?? null])
    ).toEqual([
      ["subscription", "needs_attention", "Subscribe"],
      ["payment_processing", "needs_attention", "Set up payments"],
    ]);
  });

  it("surfaces configuration gaps in compact billing readiness", () => {
    expect(
      getSettingsBillingReadiness({
        subscription_status: "active",
        stripe_connect_account_id: "acct_123",
        billingConfigured: false,
        connectConfigured: false,
      }).map(item => [item.key, item.state, item.detail])
    ).toEqual([
      ["subscription", "error", "Stripe subscription billing is not configured."],
      ["payment_processing", "needs_attention", "Stripe Connect is not configured."],
    ]);
  });
});
