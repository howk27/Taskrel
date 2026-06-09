import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("business_name, stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  const sent: string[] = [];

  // Create Stripe payment link if Connect account exists
  let paymentLink = invoice.stripe_payment_link;
  if (!paymentLink && contractor?.stripe_connect_account_id) {
    try {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const product = await stripe.products.create(
        { name: `Invoice ${invoice.invoice_number} — ${invoice.client_name}` },
        { stripeAccount: contractor.stripe_connect_account_id }
      );
      const price = await stripe.prices.create(
        { product: product.id, unit_amount: Math.round(invoice.total * 100), currency: "usd" },
        { stripeAccount: contractor.stripe_connect_account_id }
      );
      const link = await stripe.paymentLinks.create(
        { line_items: [{ price: price.id, quantity: 1 }] },
        { stripeAccount: contractor.stripe_connect_account_id }
      );
      paymentLink = link.url;
      await supabase.from("invoices").update({ stripe_payment_link: paymentLink }).eq("id", id);
    } catch (err) {
      console.error("Stripe payment link error:", err);
    }
  }

  // Send email
  if (invoice.client_email) {
    try {
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      await sgMail.send({
        to: invoice.client_email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `Invoice ${invoice.invoice_number} from ${contractor?.business_name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0F172A;color:#fff;padding:32px;border-radius:12px">
            <h1 style="font-size:24px;font-weight:800;margin:0 0 4px">task<span style="color:#F97316">rel</span></h1>
            <p style="color:#94A3B8;margin:0 0 32px">Invoice from ${contractor?.business_name}</p>
            <h2 style="margin:0 0 8px">Hi ${invoice.client_name},</h2>
            <p style="color:#CBD5E1">${invoice.invoice_number} for $${invoice.total.toFixed(2)} is ready.</p>
            ${paymentLink ? `<a href="${paymentLink}" style="display:inline-block;margin-top:24px;background:#F97316;color:#fff;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none">Pay Now — $${invoice.total.toFixed(2)}</a>` : ""}
          </div>
        `,
      });
      sent.push("email");
    } catch (err) {
      console.error("SendGrid error:", err);
    }
  }

  // Send SMS
  if (invoice.client_phone) {
    try {
      const twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const msg = paymentLink
        ? `Invoice ${invoice.invoice_number} from ${contractor?.business_name}: $${invoice.total.toFixed(2)}. Pay here: ${paymentLink}`
        : `Invoice ${invoice.invoice_number} from ${contractor?.business_name}: $${invoice.total.toFixed(2)}.`;

      await twilio.messages.create({
        body: msg,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: invoice.client_phone,
      });
      sent.push("sms");
    } catch (err) {
      console.error("Twilio error:", err);
    }
  }

  if (sent.length > 0) {
    await supabase
      .from("invoices")
      .update({ status: "sent", sent_via: sent })
      .eq("id", id);
  }

  return NextResponse.json({ sent });
}
