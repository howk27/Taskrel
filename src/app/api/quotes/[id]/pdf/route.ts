import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBusinessSnapshot, renderQuoteDocumentHtml } from "@/lib/quote-document";
import { renderQuotePdf } from "@/lib/pdf/generate-quote-pdf";
import type { BusinessSnapshot, QuoteTemplatePreset } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

const ALLOWED_PRESETS = new Set<QuoteTemplatePreset>(["classic", "modern", "compact"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONTRACTOR_SELECT =
  "id, business_name, email, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_policy_text";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // MUST-FIX #8: validate the id shape before it reaches the database.
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid quote id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select(CONTRACTOR_SELECT)
    .eq("user_id", user.id)
    .single();
  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  // MUST-FIX #2: scope by contractor_id (defense-in-depth over RLS). 404 (not
  // 403) so quote-id existence is not disclosed across tenants.
  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("contractor_id", contractor.id)
    .single();
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const presetParam = request.nextUrl.searchParams.get("preset") as QuoteTemplatePreset | null;
  const preset: QuoteTemplatePreset =
    presetParam && ALLOWED_PRESETS.has(presetParam)
      ? presetParam
      : (quote.template_preset ?? "classic") as QuoteTemplatePreset;
  const business = (quote.business_snapshot ?? buildBusinessSnapshot(contractor)) as BusinessSnapshot;

  try {
    const html = renderQuoteDocumentHtml({ quote, business, preset });
    const pdf = await renderQuotePdf(html);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quote-${id}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    // MUST-FIX #6: log server-side, return a generic message.
    console.error("Quote PDF generation failed", { id, err });
    return NextResponse.json({ error: "PDF could not be generated. Please try again." }, { status: 503 });
  }
}
