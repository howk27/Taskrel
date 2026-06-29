import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderQuoteDocumentHtml } from "@/lib/quote-document";
import { renderDocumentPdf } from "@/lib/pdf/generate-quote-pdf";
import { checkPdfCooldown } from "@/lib/pdf/pdf-rate-limit";
import type { BusinessSnapshot, QuoteTemplatePreset } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

function num(value: unknown): number {
  return Number(value ?? 0);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // MUST-FIX #3: per-token cooldown — this route launches Chromium and is
  // reachable by anyone holding the token.
  if (checkPdfCooldown(token)) {
    return NextResponse.json(
      { error: "Please wait a moment before downloading this quote again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const supabase = createAdminClient();
  // Scoped strictly to the token; only the fields the document needs.
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "client_name, client_address, client_email, client_phone, line_items, subtotal, tax_rate, tax_amount, total, notes, scheduled_start, scheduled_end, created_at, business_snapshot, template_preset",
    )
    .eq("public_access_token", token)
    .single();

  if (!quote || !quote.business_snapshot) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  try {
    const html = renderQuoteDocumentHtml({
      quote: {
        ...quote,
        subtotal: num(quote.subtotal),
        tax_rate: num(quote.tax_rate),
        tax_amount: num(quote.tax_amount),
        total: num(quote.total),
      },
      business: quote.business_snapshot as BusinessSnapshot,
      preset: (quote.template_preset ?? "classic") as QuoteTemplatePreset,
    });
    const pdf = await renderDocumentPdf(html);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="quote.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("Public quote PDF generation failed", { token: token.slice(0, 6), err });
    return NextResponse.json({ error: "PDF could not be generated. Please try again." }, { status: 503 });
  }
}
