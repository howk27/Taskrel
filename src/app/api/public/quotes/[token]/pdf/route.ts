import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderQuoteDocumentHtml } from "@/lib/quote-document";
import { quotePdfFilename } from "@/lib/document-format";
import { renderDocumentPdf } from "@/lib/pdf/generate-quote-pdf";
import { PDF_COOLDOWN_MS, isPdfOnCooldown } from "@/lib/pdf/pdf-rate-limit";
import type { BusinessSnapshot, QuoteTemplatePreset } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

function num(value: unknown): number {
  return Number(value ?? 0);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = createAdminClient();
  // Scoped strictly to the token; only the fields the document needs.
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, client_name, client_address, client_email, client_phone, line_items, subtotal, tax_rate, tax_amount, total, notes, scheduled_start, scheduled_end, created_at, business_snapshot, template_preset, last_pdf_generated_at",
    )
    .eq("public_access_token", token)
    .single();

  if (!quote || !quote.business_snapshot) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // MUST-FIX #3 (durable): this route launches Chromium and is reachable by
  // anyone holding the token. The cooldown is backed by last_pdf_generated_at
  // so it survives across serverless instances and cold starts.
  if (isPdfOnCooldown(quote.last_pdf_generated_at)) {
    return NextResponse.json(
      { error: "Please wait a moment before downloading this quote again." },
      { status: 429, headers: { "Retry-After": String(PDF_COOLDOWN_MS / 1000) } },
    );
  }

  // Claim the cooldown slot before rendering so concurrent/rapid requests see
  // it immediately and a failed render still consumes the slot (fail-safe).
  await supabase
    .from("quotes")
    .update({ last_pdf_generated_at: new Date().toISOString() })
    .eq("id", quote.id);

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
        "Content-Disposition": `inline; filename="${quotePdfFilename(quote.client_name, quote.created_at)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("Public quote PDF generation failed", { token: token.slice(0, 6), err });
    return NextResponse.json({ error: "PDF could not be generated. Please try again." }, { status: 503 });
  }
}
