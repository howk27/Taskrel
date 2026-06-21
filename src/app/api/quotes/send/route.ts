import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMissingEnv } from "@/lib/env";
import { buildPublicQuoteUrl, generatePublicQuoteToken, renderPublicQuoteEmailHtml } from "@/lib/public-quote";
import { buildBusinessSnapshot, renderQuoteDocumentHtml } from "@/lib/quote-document";
import { describeSendGridError } from "@/lib/sendgrid-error";
import type { QuoteTemplatePreset } from "@/types";
import twilio from "twilio";

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { quoteId, via } = body; // via: ['email'] | ['sms'] | ['email','sms']

  const contractorSelect = "id, business_name, email, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_policy_text, quote_template_preset";
  const fallbackContractorSelect = "id, business_name, email, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_template_preset";
  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select(contractorSelect)
    .eq("user_id", user.id)
    .single();
  const { data: fallbackContractor } = contractorError?.message.includes("quote_policy_text")
    ? await supabase
      .from("contractors")
      .select(fallbackContractorSelect)
      .eq("user_id", user.id)
      .single()
    : { data: null };
  const quoteContractor = contractor ?? (fallbackContractor ? { ...fallbackContractor, quote_policy_text: null } : null);

  if (!quoteContractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("contractor_id", quoteContractor.id)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const businessSnapshot = quote.business_snapshot ?? buildBusinessSnapshot(quoteContractor);
  const templatePreset = (quote.template_preset ?? quoteContractor.quote_template_preset ?? "classic") as QuoteTemplatePreset;
  const publicAccessToken = quote.public_access_token ?? generatePublicQuoteToken();
  const quoteUrl = buildPublicQuoteUrl(process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin, publicAccessToken);
  const { error: publicLinkError } = await supabase
    .from("quotes")
    .update({
      business_snapshot: businessSnapshot,
      template_preset: templatePreset,
      public_access_token: publicAccessToken,
    })
    .eq("id", quoteId)
    .eq("contractor_id", quoteContractor.id);

  if (publicLinkError) {
    return NextResponse.json(
      {
        error: "Quote link could not be prepared.",
        details: [{ channel: "quote", code: "public_link", message: publicLinkError.message }],
      },
      { status: 500 },
    );
  }

  const errors: string[] = [];
  const details: { channel: string; code: string; message: string }[] = [];
  const sent: string[] = [];

  if (via.includes("email") && quote.client_email) {
    const missingEmailEnv = getMissingEnv(["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"]);
    if (missingEmailEnv.length > 0) {
      errors.push("email_config");
      details.push({
        channel: "email",
        code: "email_config",
        message: `Missing email configuration: ${missingEmailEnv.join(", ")}.`,
      });
    } else {
      try {
        const sgMail = (await import("@sendgrid/mail")).default;
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

        await sgMail.send({
          to: quote.client_email,
          from: process.env.SENDGRID_FROM_EMAIL!,
          subject: `Quote from ${quoteContractor.business_name ?? "Your Contractor"}`,
          html: renderPublicQuoteEmailHtml({
            businessName: quoteContractor.business_name ?? "Your Contractor",
            quoteUrl,
            quoteHtml: renderQuoteDocumentHtml({ quote, business: businessSnapshot, preset: templatePreset }),
          }),
        });
        sent.push("email");
      } catch (err) {
        const emailError = describeSendGridError(err);
        console.error("SendGrid error:", emailError, err);
        errors.push("email");
        details.push({ channel: "email", code: emailError.code, message: emailError.message });
      }
    }
  } else if (via.includes("email")) {
    errors.push("email_missing_client");
    details.push({
      channel: "email",
      code: "email_missing_client",
      message: "This quote does not have a client email address.",
    });
  }

  if (via.includes("sms") && quote.client_phone) {
    const missingSmsEnv = getMissingEnv(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]);
    if (missingSmsEnv.length > 0) {
      errors.push("sms_config");
      details.push({
        channel: "sms",
        code: "sms_config",
        message: `Missing SMS configuration: ${missingSmsEnv.join(", ")}.`,
      });
    } else {
    try {
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const msg = `Hi ${quote.client_name}, ${quoteContractor.business_name} sent you a quote for $${quote.total.toFixed(2)}. View and approve it here: ${quoteUrl}`;

      await twilioClient.messages.create({
        body: msg,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: quote.client_phone,
      });
      sent.push("sms");
    } catch (err) {
      console.error("Twilio error:", err);
      errors.push("sms");
      details.push({ channel: "sms", code: "sms", message: "Twilio could not send the SMS." });
    }
    }
  } else if (via.includes("sms")) {
    errors.push("sms_missing_client");
    details.push({
      channel: "sms",
      code: "sms_missing_client",
      message: "This quote does not have a client phone number.",
    });
  }

  // Update quote status and sent_via
  if (sent.length > 0) {
    await supabase
      .from("quotes")
      .update({
        status: "sent",
        sent_via: sent,
        follow_up_due_at: daysFromNow(2),
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
  return NextResponse.json({ sent, errors, details, quoteUrl }, { status });
}
