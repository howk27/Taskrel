import { NextRequest, NextResponse } from "next/server";
import { canApprovePublicQuoteStatus, renderApprovalNotificationHtml } from "@/lib/public-quote";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status, client_name, contractor_id, valid_until, contractors(email, business_name)")
    .eq("public_access_token", token)
    .single<{
      id: string;
      status: string;
      client_name: string;
      contractor_id: string;
      valid_until: string | null;
      contractors: { email: string; business_name: string } | null;
    }>();

  if (!quote) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  if (!canApprovePublicQuoteStatus(quote.status)) {
    return NextResponse.redirect(new URL(`/q/${token}`, request.url), { status: 303 });
  }

  const isExpired =
    quote.valid_until !== null &&
    new Date() > new Date(quote.valid_until);
  if (isExpired) {
    return NextResponse.redirect(new URL(`/q/${token}`, request.url), { status: 303 });
  }

  const alreadyApproved = quote.status === "approved";

  if (!alreadyApproved) {
    const { error: approvalError } = await supabase
      .from("quotes")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", quote.id)
      .eq("contractor_id", quote.contractor_id);

    if (approvalError) {
      console.error("Approval DB update failed", { quoteId: quote.id, message: approvalError.message });
      return NextResponse.redirect(new URL(`/q/${token}`, request.url), { status: 303 });
    }

    // Best-effort contractor notification
    if (quote.contractors?.email) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
        const quoteUrl = `${appUrl}/quotes/${quote.id}`;
        const sgMail = (await import("@sendgrid/mail")).default;
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
        await sgMail.send({
          to: quote.contractors.email,
          from: process.env.SENDGRID_FROM_EMAIL!,
          subject: `Quote approved by ${quote.client_name}`,
          html: renderApprovalNotificationHtml({
            clientName: quote.client_name,
            quoteUrl,
          }),
        });
      } catch (err) {
        console.error("Approval notification failed", {
          quoteId: quote.id,
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  return NextResponse.redirect(new URL(`/q/${token}?approved=1`, request.url), { status: 303 });
}
