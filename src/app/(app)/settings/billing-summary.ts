import { getBillingReadiness, type ReadinessItem } from "../../../lib/readiness/setup-readiness";

export function getSettingsBillingReadiness(input: {
  subscription_status: "trialing" | "active" | "past_due" | "canceled" | string | null;
  stripe_connect_account_id: string | null;
  billingConfigured: boolean;
  connectConfigured: boolean;
}): ReadinessItem[] {
  return getBillingReadiness({
    subscription_status: input.subscription_status,
    stripe_connect_account_id: input.stripe_connect_account_id,
    connectReturnState: null,
    billingConfigured: input.billingConfigured,
    connectConfigured: input.connectConfigured,
  });
}
