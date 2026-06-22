import { getBillingReadiness, getWebhookReadiness, type ReadinessItem } from "../../../../lib/readiness/setup-readiness";

export function getBillingPageReadiness(input: {
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | string | null;
  stripeConnectAccountId: string | null;
  connectReturnState: "success" | "refresh" | "error" | null;
  billingConfigured: boolean;
  connectConfigured: boolean;
  webhookConfigured: boolean;
  subscribed: boolean;
}): ReadinessItem[] {
  return [
    ...getBillingReadiness({
      subscription_status: input.subscriptionStatus,
      stripe_connect_account_id: input.stripeConnectAccountId,
      connectReturnState: input.connectReturnState,
      billingConfigured: input.billingConfigured,
      connectConfigured: input.connectConfigured,
    }),
    getWebhookReadiness({
      webhookConfigured: input.webhookConfigured,
      pending:
        input.subscribed &&
        input.subscriptionStatus !== "active" &&
        input.subscriptionStatus !== "trialing",
    }),
  ];
}
