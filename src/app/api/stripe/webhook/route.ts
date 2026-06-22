import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getConfiguredEnv } from "@/lib/env";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = getConfiguredEnv("STRIPE_WEBHOOK_SECRET");
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
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
      const invoiceId = pi.metadata?.invoice_id;
      if (!invoiceId) {
        console.warn("Stripe payment succeeded without invoice_id metadata", { paymentIntentId: pi.id });
        break;
      }

      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, total")
        .eq("id", invoiceId)
        .maybeSingle();

      if (!invoice) {
        console.warn("Stripe payment succeeded for unknown invoice", { paymentIntentId: pi.id, invoiceId });
        break;
      }

      const amountPaid = pi.amount_received / 100;
      await supabase
        .from("invoices")
        .update({
          status: amountPaid >= Number(invoice.total ?? 0) ? "paid" : "sent",
          amount_paid: amountPaid,
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: pi.id,
        })
        .eq("id", invoice.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
