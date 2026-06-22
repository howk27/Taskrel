import { describe, expect, it } from "vitest";

import { getBillingPageReadiness } from "./billing-readiness";

describe("getBillingPageReadiness", () => {
  it("adds webhook pending status after a subscribed return until Stripe confirms the subscription", () => {
    expect(
      getBillingPageReadiness({
        subscriptionStatus: "past_due",
        stripeConnectAccountId: null,
        connectReturnState: "refresh",
        billingConfigured: true,
        connectConfigured: true,
        webhookConfigured: true,
        subscribed: true,
      }).map(item => [item.key, item.state])
    ).toEqual([
      ["subscription", "needs_attention"],
      ["payment_processing", "needs_attention"],
      ["webhook", "pending"],
    ]);
  });

  it("shows webhook configuration errors even when billing flows are otherwise ready", () => {
    expect(
      getBillingPageReadiness({
        subscriptionStatus: "active",
        stripeConnectAccountId: "acct_123",
        connectReturnState: null,
        billingConfigured: true,
        connectConfigured: true,
        webhookConfigured: false,
        subscribed: false,
      }).map(item => [item.key, item.state])
    ).toEqual([
      ["subscription", "complete"],
      ["payment_processing", "complete"],
      ["webhook", "error"],
    ]);
  });
});
