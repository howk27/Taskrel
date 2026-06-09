import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { quoteId, via } = body; // via: ['email'] | ['sms'] | ['email','sms']

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("business_name, email")
    .eq("user_id", user.id)
    .single();

  const errors: string[] = [];
  const sent: string[] = [];

  if (via.includes("email") && quote.client_email) {
    try {
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      const lineItemsHtml = quote.line_items
        .map((item: { description: string; quantity: number; unit?: string; unit_price: number; total: number }) =>
          `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #334155">${item.description}</td>
            <td style="padding:8px 0;border-bottom:1px solid #334155;text-align:right">${item.quantity} ${item.unit ?? ""}</td>
            <td style="padding:8px 0;border-bottom:1px solid #334155;text-align:right">$${item.unit_price.toFixed(2)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #334155;text-align:right">$${item.total.toFixed(2)}</td>
          </tr>`
        )
        .join("");

      await sgMail.send({
        to: quote.client_email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `Quote from ${contractor?.business_name ?? "Your Contractor"}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0F172A;color:#fff;padding:32px;border-radius:12px">
            <h1 style="font-size:24px;font-weight:800;margin:0 0 4px">task<span style="color:#F97316">rel</span></h1>
            <p style="color:#94A3B8;margin:0 0 32px">Quote from ${contractor?.business_name}</p>

            <h2 style="font-size:18px;margin:0 0 16px">Hi ${quote.client_name},</h2>
            <p style="color:#CBD5E1">Please find your quote below.</p>

            <table style="width:100%;border-collapse:collapse;margin:24px 0">
              <thead>
                <tr style="color:#94A3B8;font-size:12px;text-transform:uppercase">
                  <th style="padding:8px 0;text-align:left">Description</th>
                  <th style="padding:8px 0;text-align:right">Qty</th>
                  <th style="padding:8px 0;text-align:right">Unit Price</th>
                  <th style="padding:8px 0;text-align:right">Total</th>
                </tr>
              </thead>
              <tbody>${lineItemsHtml}</tbody>
            </table>

            <div style="text-align:right;margin-top:16px">
              <p style="color:#94A3B8;margin:4px 0">Subtotal: $${quote.subtotal.toFixed(2)}</p>
              ${quote.tax_amount > 0 ? `<p style="color:#94A3B8;margin:4px 0">Tax: $${quote.tax_amount.toFixed(2)}</p>` : ""}
              <p style="font-size:20px;font-weight:700;color:#F97316;margin:8px 0">Total: $${quote.total.toFixed(2)}</p>
            </div>

            ${quote.notes ? `<p style="color:#CBD5E1;margin-top:24px;padding-top:24px;border-top:1px solid #334155">${quote.notes}</p>` : ""}

            <p style="color:#64748B;font-size:12px;margin-top:32px">Sent via Taskrel</p>
          </div>
        `,
      });
      sent.push("email");
    } catch (err) {
      console.error("SendGrid error:", err);
      errors.push("email");
    }
  }

  if (via.includes("sms") && quote.client_phone) {
    try {
      const twilio = require("twilio")(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const msg = `Hi ${quote.client_name}, ${contractor?.business_name} sent you a quote for $${quote.total.toFixed(2)}. Reply QUOTE to request details.`;

      await twilio.messages.create({
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

  // Update quote status and sent_via
  if (sent.length > 0) {
    await supabase
      .from("quotes")
      .update({ status: "sent", sent_via: sent })
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

  return NextResponse.json({ sent, errors });
}
