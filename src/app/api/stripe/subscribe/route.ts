import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getConfiguredEnv, getMissingEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const stripe = getStripe();
  const missingEnv = getMissingEnv(["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "NEXT_PUBLIC_APP_URL"]);
  if (!stripe || missingEnv.length > 0) {
    return NextResponse.json(
      { error: "Stripe subscription billing is not configured.", missing: missingEnv },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, email, business_name, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let customerId = contractor.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: contractor.email,
      name: contractor.business_name,
      metadata: { contractor_id: contractor.id },
    });
    customerId = customer.id;
    await supabase
      .from("contractors")
      .update({ stripe_customer_id: customerId })
      .eq("id", contractor.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: getConfiguredEnv("STRIPE_PRICE_ID")!, quantity: 1 }],
    success_url: `${getConfiguredEnv("NEXT_PUBLIC_APP_URL")}/settings/billing?subscribed=true`,
    cancel_url: `${getConfiguredEnv("NEXT_PUBLIC_APP_URL")}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
