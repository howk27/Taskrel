import { describe, expect, it } from "vitest";
import { buildPaymentReadiness } from "./payment-readiness";

describe("buildPaymentReadiness", () => {
  it("marks billing and client payments incomplete when Stripe setup is missing", () => {
    const readiness = buildPaymentReadiness({
      env: {
        stripeSecretConfigured: false,
        stripePriceConfigured: false,
        appUrlConfigured: true,
        webhookSecretConfigured: false,
        supabaseServiceRoleConfigured: false,
      },
      contractor: {
        subscription_status: null,
        stripe_connect_account_id: null,
      },
    });

    expect(readiness.completedCount).toBe(0);
    expect(readiness.totalCount).toBe(4);
    expect(readiness.readyForPaidLaunch).toBe(false);
    expect(readiness.items.map(item => [item.key, item.complete])).toEqual([
      ["subscription_checkout", false],
      ["subscription_status", false],
      ["client_payment_account", false],
      ["payment_webhook", false],
    ]);
  });

  it("marks paid launch ready when billing, connect, and webhook are configured", () => {
    const readiness = buildPaymentReadiness({
      env: {
        stripeSecretConfigured: true,
        stripePriceConfigured: true,
        appUrlConfigured: true,
        webhookSecretConfigured: true,
        supabaseServiceRoleConfigured: true,
      },
      contractor: {
        subscription_status: "active",
        stripe_connect_account_id: "acct_123",
      },
    });

    expect(readiness.completedCount).toBe(4);
    expect(readiness.percentComplete).toBe(100);
    expect(readiness.readyForPaidLaunch).toBe(true);
  });

  it("requires Supabase admin credentials for webhook readiness", () => {
    const readiness = buildPaymentReadiness({
      env: {
        stripeSecretConfigured: true,
        stripePriceConfigured: true,
        appUrlConfigured: true,
        webhookSecretConfigured: true,
        supabaseServiceRoleConfigured: false,
      },
      contractor: {
        subscription_status: "active",
        stripe_connect_account_id: "acct_123",
      },
    });

    expect(readiness.items.find(item => item.key === "payment_webhook")?.complete).toBe(false);
    expect(readiness.readyForPaidLaunch).toBe(false);
  });
});
