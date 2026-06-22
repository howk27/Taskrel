import { redirect } from "next/navigation";
import { getMissingEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("subscription_status, stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  return (
    <BillingClient
      subscriptionStatus={contractor?.subscription_status ?? null}
      stripeConnectAccountId={contractor?.stripe_connect_account_id ?? null}
      billingConfigured={getMissingEnv(["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "NEXT_PUBLIC_APP_URL"]).length === 0}
      connectConfigured={getMissingEnv(["STRIPE_SECRET_KEY", "NEXT_PUBLIC_APP_URL"]).length === 0}
      webhookConfigured={getMissingEnv(["STRIPE_WEBHOOK_SECRET"]).length === 0}
    />
  );
}
