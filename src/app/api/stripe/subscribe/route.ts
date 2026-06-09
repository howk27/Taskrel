import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(_: NextRequest) {
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
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?subscribed=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
