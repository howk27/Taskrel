export type PaymentReadinessKey =
  | "subscription_checkout"
  | "subscription_status"
  | "client_payment_account"
  | "payment_webhook";

export type PaymentReadinessItem = {
  key: PaymentReadinessKey;
  label: string;
  detail: string;
  impact: string;
  complete: boolean;
};

export type PaymentReadinessInput = {
  env: {
    stripeSecretConfigured: boolean;
    stripePriceConfigured: boolean;
    appUrlConfigured: boolean;
    webhookSecretConfigured: boolean;
    supabaseServiceRoleConfigured: boolean;
  };
  contractor: {
    subscription_status: string | null;
    stripe_connect_account_id: string | null;
  };
};

export type PaymentReadinessState = {
  items: PaymentReadinessItem[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  readyForPaidLaunch: boolean;
};

function activeSubscription(status: string | null) {
  return status === "active" || status === "trialing";
}

export function buildPaymentReadiness(input: PaymentReadinessInput): PaymentReadinessState {
  const subscriptionCheckoutReady = input.env.stripeSecretConfigured && input.env.stripePriceConfigured && input.env.appUrlConfigured;
  const webhookReady = input.env.stripeSecretConfigured && input.env.webhookSecretConfigured && input.env.supabaseServiceRoleConfigured;
  const connectReady = input.env.stripeSecretConfigured && Boolean(input.contractor.stripe_connect_account_id);
  const subscriptionReady = activeSubscription(input.contractor.subscription_status);

  const items: PaymentReadinessItem[] = [
    {
      key: "subscription_checkout",
      label: "Subscription checkout",
      detail: subscriptionCheckoutReady
        ? "Stripe Checkout can sell the $19/month plan."
        : "Set Stripe secret key, price ID, and app URL before public sale.",
      impact: "Lets contractors subscribe without founder help.",
      complete: subscriptionCheckoutReady,
    },
    {
      key: "subscription_status",
      label: "Account subscription",
      detail: subscriptionReady
        ? `Account is ${input.contractor.subscription_status}.`
        : "No active or trialing subscription is recorded for this workspace.",
      impact: "Makes paid access status clear after checkout or access-code redemption.",
      complete: subscriptionReady,
    },
    {
      key: "client_payment_account",
      label: "Client payment account",
      detail: connectReady
        ? "Stripe Connect is linked for invoice payment collection."
        : "Connect a Stripe account before relying on invoice payment links.",
      impact: "Keeps contractor-client payments in the quote-to-cash workflow.",
      complete: connectReady,
    },
    {
      key: "payment_webhook",
      label: "Payment webhook",
      detail: webhookReady
        ? "Stripe webhook and Supabase admin credentials are configured."
        : "Configure the Stripe webhook secret and Supabase service role key so Taskrel can update subscription and invoice status.",
      impact: "Keeps billing and paid invoice statuses synchronized.",
      complete: webhookReady,
    },
  ];

  const completedCount = items.filter(item => item.complete).length;
  const totalCount = items.length;

  return {
    items,
    completedCount,
    totalCount,
    percentComplete: Math.round((completedCount / totalCount) * 100),
    readyForPaidLaunch: completedCount === totalCount,
  };
}
