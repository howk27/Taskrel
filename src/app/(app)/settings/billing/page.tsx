import { redirect } from "next/navigation";
import { BillingClient } from "@/components/settings/billing-client";
import { getConfiguredEnv } from "@/lib/env";
import { buildPaymentReadiness } from "@/lib/payment-readiness";
import { createClient } from "@/lib/supabase/server";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ connect?: string; subscribed?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("subscription_status, stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  const readiness = buildPaymentReadiness({
    env: {
      stripeSecretConfigured: Boolean(getConfiguredEnv("STRIPE_SECRET_KEY")),
      stripePriceConfigured: Boolean(getConfiguredEnv("STRIPE_PRICE_ID")),
      appUrlConfigured: Boolean(getConfiguredEnv("NEXT_PUBLIC_APP_URL")),
      webhookSecretConfigured: Boolean(getConfiguredEnv("STRIPE_WEBHOOK_SECRET")),
      supabaseServiceRoleConfigured: Boolean(getConfiguredEnv("SUPABASE_SERVICE_ROLE_KEY")),
    },
    contractor: {
      subscription_status: contractor?.subscription_status ?? null,
      stripe_connect_account_id: contractor?.stripe_connect_account_id ?? null,
    },
  });

  return (
    <BillingClient
      connectSuccess={params?.connect === "success"}
      subscribed={params?.subscribed === "true"}
      readiness={readiness}
    />
  );
}
