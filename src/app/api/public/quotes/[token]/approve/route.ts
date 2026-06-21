import { NextRequest, NextResponse } from "next/server";
import { canApprovePublicQuoteStatus } from "@/lib/public-quote";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("public_access_token", token)
    .single<{ id: string; status: string }>();

  if (!quote) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!canApprovePublicQuoteStatus(quote.status)) {
    return NextResponse.redirect(new URL(`/q/${token}`, request.url));
  }

  if (quote.status !== "approved") {
    await supabase
      .from("quotes")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", quote.id);
  }

  return NextResponse.redirect(new URL(`/q/${token}?approved=1`, request.url), { status: 303 });
}
