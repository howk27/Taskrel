import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderResendRequestHtml } from "@/lib/public-quote";

const RESEND_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, client_name, client_address, last_resend_requested_at, contractors(email)")
    .eq("public_access_token", token)
    .single<{
      id: string;
      client_name: string;
      client_address: string | null;
      last_resend_requested_at: string | null;
      contractors: { email: string } | null;
    }>();

  if (!quote) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  // Rate-limit: 1 request per hour per quote
  if (quote.last_resend_requested_at) {
    const elapsed = Date.now() - Date.parse(quote.last_resend_requested_at);
    if (elapsed >= 0 && elapsed < RESEND_COOLDOWN_MS) {
      return NextResponse.redirect(
        new URL(`/q/${token}?resend_throttled=1`, request.url),
        { status: 303 },
      );
    }
  }

  // Best-effort slot claim — concurrent submits within the same millisecond may slip through.
  await supabase
    .from("quotes")
    .update({ last_resend_requested_at: new Date().toISOString() })
    .eq("id", quote.id)
    .eq("public_access_token", token);

  // Best-effort notification to contractor
  if (quote.contractors?.email) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
      const quoteUrl = `${appUrl}/quotes/${quote.id}`;
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
      await sgMail.send({
        to: quote.contractors.email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `${quote.client_name} is requesting a new quote`,
        html: renderResendRequestHtml({
          clientName: quote.client_name,
          clientAddress: quote.client_address,
          quoteUrl,
        }),
      });
    } catch (err) {
      console.error("Resend request notification failed", {
        quoteId: quote.id,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.redirect(
    new URL(`/q/${token}?resend_requested=1`, request.url),
    { status: 303 },
  );
}
