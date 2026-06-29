import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBusinessSnapshot } from "@/lib/quote-document";
import { renderInvoiceDocumentHtml } from "@/lib/invoice-document";
import { renderDocumentPdf } from "@/lib/pdf/generate-quote-pdf";

export const runtime = "nodejs";
export const maxDuration = 15;
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONTRACTOR_SELECT =
  "id, business_name, email, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_policy_text";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Validate the id shape before it reaches the database.
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
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

  // Scope by contractor_id (defense-in-depth over RLS). 404 (not 403) so
  // invoice-id existence is not disclosed across tenants.
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("contractor_id", contractor.id)
    .single();
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Invoices have no frozen snapshot column — build business info live.
  const business = buildBusinessSnapshot(contractor);
  // Keep the filename header injection-safe; invoice_number is contractor-set.
  const safeNumber = String(invoice.invoice_number ?? id).replace(/[^A-Za-z0-9_-]/g, "");

  try {
    const html = renderInvoiceDocumentHtml({ invoice, business });
    const pdf = await renderDocumentPdf(html);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${safeNumber}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    // Log server-side, return a generic message.
    console.error("Invoice PDF generation failed", { id, err });
    return NextResponse.json({ error: "PDF could not be generated. Please try again." }, { status: 503 });
  }
}
