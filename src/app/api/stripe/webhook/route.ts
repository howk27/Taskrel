import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  switch (event.type) {
    // ── Subscription events ────────────────────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("contractors")
        .update({ subscription_status: sub.status })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("contractors")
        .update({ subscription_status: "canceled" })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    // ── Connect: invoice paid by client ───────────────────────────────────
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.invoice_id) {
        await supabase
          .from("invoices")
          .update({
            status: "paid",
            amount_paid: pi.amount_received / 100,
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: pi.id,
          })
          .eq("id", pi.metadata.invoice_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
