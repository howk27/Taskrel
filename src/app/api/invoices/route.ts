import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { quoteId, ...rest } = body;

  // Get invoice number
  const { data: numberResult } = await supabase
    .rpc("next_invoice_number", { p_contractor_id: contractor.id });

  let invoiceData: Record<string, unknown> = {
    contractor_id: contractor.id,
    invoice_number: numberResult ?? "INV-0001",
    ...rest,
  };

  // If converting from quote, pull quote data
  if (quoteId) {
    const { data: quote } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quote) {
      invoiceData = {
        ...invoiceData,
        quote_id: quoteId,
        client_id: quote.client_id,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        line_items: quote.line_items,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
      };

      // Mark quote as approved
      await supabase
        .from("quotes")
        .update({ status: "approved" })
        .eq("id", quoteId);
    }
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert(invoiceData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("contractor_id", contractor?.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
