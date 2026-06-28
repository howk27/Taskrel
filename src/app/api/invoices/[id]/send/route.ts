import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMissingEnv } from "@/lib/env";
import { buildInvoicePaymentLinkParams } from "@/lib/invoice-payment";
import { getStripe } from "@/lib/stripe";
import { describeSendGridError } from "@/lib/sendgrid-error";
import { buildDeliveryEventRows, type DeliveryEventAttempt } from "@/lib/delivery-events";
import twilio from "twilio";

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
    .select("id, business_name, stripe_connect_account_id")
    .eq("user_id", user.id)
    .single();

  const sent: string[] = [];
  const errors: string[] = [];
  const details: { channel: string; code: string; message: string }[] = [];
  const deliveryAttempts: DeliveryEventAttempt[] = [];

  let paymentLink = invoice.stripe_payment_link;
  let paymentLinkState: "ready" | "created" | "missing_connect" | "stripe_config" | "error" = paymentLink ? "ready" : "missing_connect";
  if (!paymentLink && contractor?.stripe_connect_account_id) {
    const stripe = getStripe();
    if (!stripe) {
      paymentLinkState = "stripe_config";
      errors.push("stripe_config");
      details.push({ channel: "stripe", code: "stripe_config", message: "Stripe is not configured." });
      deliveryAttempts.push({
        channel: "stripe",
        provider: "stripe",
        recipient: invoice.client_email ?? invoice.client_phone,
        status: "error",
        code: "stripe_config",
        message: "Stripe is not configured.",
      });
      console.warn("Stripe payment link skipped: STRIPE_SECRET_KEY is not configured.");
    } else {
      try {
        const product = await stripe.products.create(
          { name: `Invoice ${invoice.invoice_number} - ${invoice.client_name}` },
          { stripeAccount: contractor.stripe_connect_account_id }
        );
        const price = await stripe.prices.create(
          { product: product.id, unit_amount: Math.round(invoice.total * 100), currency: "usd" },
          { stripeAccount: contractor.stripe_connect_account_id }
        );
        const link = await stripe.paymentLinks.create(
          buildInvoicePaymentLinkParams({ invoiceId: invoice.id, priceId: price.id }),
          { stripeAccount: contractor.stripe_connect_account_id }
        );
        paymentLink = link.url;
        paymentLinkState = "created";
        await supabase.from("invoices").update({ stripe_payment_link: paymentLink }).eq("id", id);
        deliveryAttempts.push({
          channel: "stripe",
          provider: "stripe",
          recipient: invoice.client_email ?? invoice.client_phone,
          status: "success",
          code: "payment_link_created",
          message: "Online payment link created.",
          metadata: { payment_link: paymentLink },
        });
      } catch (err) {
        paymentLinkState = "error";
        console.error("Stripe payment link error:", err);
        errors.push("stripe");
        details.push({ channel: "stripe", code: "stripe", message: "Stripe could not create a payment link." });
        deliveryAttempts.push({
          channel: "stripe",
          provider: "stripe",
          recipient: invoice.client_email ?? invoice.client_phone,
          status: "error",
          code: "stripe",
          message: "Stripe could not create a payment link.",
        });
      }
    }
  }

  if (invoice.client_email) {
    const missingEmailEnv = getMissingEnv(["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"]);
    if (missingEmailEnv.length > 0) {
      console.warn(`Invoice email skipped: missing ${missingEmailEnv.join(", ")}.`);
      errors.push("email_config");
      details.push({
        channel: "email",
        code: "email_config",
        message: `Missing email configuration: ${missingEmailEnv.join(", ")}.`,
      });
      deliveryAttempts.push({
        channel: "email",
        provider: "sendgrid",
        recipient: invoice.client_email,
        status: "error",
        code: "email_config",
        message: `Missing email configuration: ${missingEmailEnv.join(", ")}.`,
      });
    } else {
      try {
        const sgMail = (await import("@sendgrid/mail")).default;
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

        await sgMail.send({
          to: invoice.client_email,
          from: process.env.SENDGRID_FROM_EMAIL!,
          subject: `Invoice ${invoice.invoice_number} from ${contractor?.business_name ?? "Your Contractor"}`,
          html: `
            <div style="font-family:Aptos,Arial,sans-serif;max-width:600px;margin:0 auto;background:#08111F;color:#F8FAFC;padding:32px;border:1px solid rgba(148,163,184,.24);border-radius:8px">
              <h1 style="font-size:24px;font-weight:800;margin:0 0 4px">task<span style="color:#FB923C">rel</span></h1>
              <p style="color:#CBD5E1;margin:0 0 32px">Invoice from ${contractor?.business_name ?? "Your Contractor"}</p>
              <h2 style="margin:0 0 8px">Hi ${invoice.client_name},</h2>
              <p style="color:#CBD5E1">${invoice.invoice_number} for $${invoice.total.toFixed(2)} is ready.</p>
              ${paymentLink ? `<a href="${paymentLink}" style="display:inline-block;margin-top:24px;background:#FB923C;color:#08111F;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none">Pay Now - $${invoice.total.toFixed(2)}</a>` : ""}
            </div>
          `,
        });
        sent.push("email");
        deliveryAttempts.push({
          channel: "email",
          provider: "sendgrid",
          recipient: invoice.client_email,
          status: "success",
          code: "sent",
          message: "Invoice email sent.",
        });
      } catch (err) {
        const emailError = describeSendGridError(err);
        console.error("SendGrid error:", emailError, err);
        errors.push("email");
        details.push({ channel: "email", code: emailError.code, message: emailError.message });
        deliveryAttempts.push({
          channel: "email",
          provider: "sendgrid",
          recipient: invoice.client_email,
          status: "error",
          code: emailError.code,
          message: emailError.message,
        });
      }
    }
  } else {
    errors.push("email_missing_client");
    details.push({
      channel: "email",
      code: "email_missing_client",
      message: "This invoice does not have a client email address.",
    });
    deliveryAttempts.push({
      channel: "email",
      provider: "sendgrid",
      recipient: null,
      status: "error",
      code: "email_missing_client",
      message: "This invoice does not have a client email address.",
    });
  }

  if (invoice.client_phone) {
    const missingSmsEnv = getMissingEnv(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]);
    if (missingSmsEnv.length > 0) {
      console.warn(`Invoice SMS skipped: missing ${missingSmsEnv.join(", ")}.`);
      errors.push("sms_config");
      details.push({
        channel: "sms",
        code: "sms_config",
        message: `Missing SMS configuration: ${missingSmsEnv.join(", ")}.`,
      });
      deliveryAttempts.push({
        channel: "sms",
        provider: "twilio",
        recipient: invoice.client_phone,
        status: "error",
        code: "sms_config",
        message: `Missing SMS configuration: ${missingSmsEnv.join(", ")}.`,
      });
    } else {
      try {
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const msg = paymentLink
          ? `Invoice ${invoice.invoice_number} from ${contractor?.business_name}: $${invoice.total.toFixed(2)}. Pay here: ${paymentLink}`
          : `Invoice ${invoice.invoice_number} from ${contractor?.business_name}: $${invoice.total.toFixed(2)}.`;

        await twilioClient.messages.create({
          body: msg,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: invoice.client_phone,
        });
        sent.push("sms");
        deliveryAttempts.push({
          channel: "sms",
          provider: "twilio",
          recipient: invoice.client_phone,
          status: "success",
          code: "sent",
          message: "Invoice SMS sent.",
        });
      } catch (err) {
        console.error("Twilio error:", err);
        errors.push("sms");
        details.push({ channel: "sms", code: "sms", message: "Twilio could not send the SMS." });
        deliveryAttempts.push({
          channel: "sms",
          provider: "twilio",
          recipient: invoice.client_phone,
          status: "error",
          code: "sms",
          message: "Twilio could not send the SMS.",
        });
      }
    }
  } else {
    errors.push("sms_missing_client");
    details.push({
      channel: "sms",
      code: "sms_missing_client",
      message: "This invoice does not have a client phone number.",
    });
    deliveryAttempts.push({
      channel: "sms",
      provider: "twilio",
      recipient: null,
      status: "error",
      code: "sms_missing_client",
      message: "This invoice does not have a client phone number.",
    });
  }

  if (deliveryAttempts.length > 0) {
    const { error: deliveryEventError } = await supabase
      .from("delivery_events")
      .insert(buildDeliveryEventRows({
        contractorId: invoice.contractor_id,
        actorUserId: user.id,
        entityType: "invoice",
        entityId: id,
        action: "send",
        attempts: deliveryAttempts,
      }));
    if (deliveryEventError) {
      console.error("Delivery event logging failed:", deliveryEventError);
    }
  }

  if (sent.length > 0) {
    await supabase
      .from("invoices")
      .update({ status: "sent", sent_via: sent })
      .eq("id", id);
  }

  const status = sent.length === 0 ? 503 : 200;
  return NextResponse.json({ sent, errors, details, paymentLink, paymentLinkState }, { status });
}
