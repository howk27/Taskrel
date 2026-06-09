import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

// Start Stripe Connect onboarding for the contractor
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, email, stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let accountId = contractor.stripe_connect_account_id;

  // Create Connect account if not already created
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: contractor.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    accountId = account.id;
    await supabase
      .from("contractors")
      .update({ stripe_connect_account_id: accountId })
      .eq("id", contractor.id);
  }

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?connect=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?connect=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
