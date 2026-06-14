import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMissingEnv } from "@/lib/env";
import { buildBusinessSnapshot, renderQuoteDocumentHtml } from "@/lib/quote-document";
import type { QuoteTemplatePreset } from "@/types";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { quoteId, via } = body; // via: ['email'] | ['sms'] | ['email','sms']

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, business_name, email, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_template_preset")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("contractor_id", contractor.id)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const businessSnapshot = quote.business_snapshot ?? buildBusinessSnapshot(contractor);
  const templatePreset = (quote.template_preset ?? contractor.quote_template_preset ?? "classic") as QuoteTemplatePreset;
  const errors: string[] = [];
  const sent: string[] = [];

  if (via.includes("email") && quote.client_email) {
    const missingEmailEnv = getMissingEnv(["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"]);
    if (missingEmailEnv.length > 0) {
      errors.push("email_config");
    } else {
    try {
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      await sgMail.send({
        to: quote.client_email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `Quote from ${contractor?.business_name ?? "Your Contractor"}`,
        html: renderQuoteDocumentHtml({ quote, business: businessSnapshot, preset: templatePreset }),
      });
      sent.push("email");
    } catch (err) {
      console.error("SendGrid error:", err);
      errors.push("email");
    }
    }
  }

  if (via.includes("sms") && quote.client_phone) {
    const missingSmsEnv = getMissingEnv(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]);
    if (missingSmsEnv.length > 0) {
      errors.push("sms_config");
    } else {
    try {
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const msg = `Hi ${quote.client_name}, ${contractor?.business_name} sent you a quote for $${quote.total.toFixed(2)}. Reply QUOTE to request details.`;

      await twilioClient.messages.create({
        body: msg,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: quote.client_phone,
      });
      sent.push("sms");
    } catch (err) {
      console.error("Twilio error:", err);
      errors.push("sms");
    }
    }
  }

  // Update quote status and sent_via
  if (sent.length > 0) {
    await supabase
      .from("quotes")
      .update({
        status: "sent",
        sent_via: sent,
        business_snapshot: businessSnapshot,
        template_preset: templatePreset,
      })
      .eq("id", quoteId);

    // Auto-create or update client record
    if (quote.client_email || quote.client_phone) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("contractor_id", quote.contractor_id)
        .or(`email.eq.${quote.client_email},phone.eq.${quote.client_phone}`)
        .maybeSingle();

      if (!existingClient) {
        const { data: newClient } = await supabase
          .from("clients")
          .insert({
            contractor_id: quote.contractor_id,
            name: quote.client_name,
            email: quote.client_email,
            phone: quote.client_phone,
            address: quote.client_address,
          })
          .select("id")
          .single();

        if (newClient) {
          await supabase
            .from("quotes")
            .update({ client_id: newClient.id })
            .eq("id", quoteId);
        }
      } else {
        await supabase
          .from("quotes")
          .update({ client_id: existingClient.id })
          .eq("id", quoteId);
      }
    }
  }

  const status = sent.length === 0 && errors.length > 0 ? 503 : 200;
  return NextResponse.json({ sent, errors }, { status });
}
