import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getConfiguredEnv } from "@/lib/env";
import { buildDeliveryEventRows } from "@/lib/delivery-events";
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
      if (pi.metadata?.invoice_id) {
        const { data: invoice } = await supabase
          .from("invoices")
          .select("id, contractor_id, client_email, client_phone")
          .eq("id", pi.metadata.invoice_id)
          .single();

        await supabase
          .from("invoices")
          .update({
            status: "paid",
            amount_paid: pi.amount_received / 100,
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: pi.id,
          })
          .eq("id", pi.metadata.invoice_id);

        if (invoice) {
          const { error: deliveryEventError } = await supabase
            .from("delivery_events")
            .insert(buildDeliveryEventRows({
              contractorId: invoice.contractor_id,
              actorUserId: null,
              entityType: "invoice",
              entityId: invoice.id,
              action: "payment",
              attempts: [{
                channel: "stripe",
                provider: "stripe",
                recipient: invoice.client_email ?? invoice.client_phone,
                status: "success",
                code: "payment_intent_succeeded",
                message: "Online payment received.",
                metadata: {
                  payment_intent_id: pi.id,
                  amount_received: pi.amount_received / 100,
                },
              }],
            }));
          if (deliveryEventError) {
            console.error("Payment delivery event logging failed:", deliveryEventError);
          }
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
