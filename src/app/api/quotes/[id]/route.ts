import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBusinessSnapshot } from "@/lib/quote-document";
import { calculateQuotePricing, determineQuotePricingSource } from "@/lib/pricing";
import { learnEditedPrices } from "@/lib/pricing-catalog";
import type { Trade } from "@/types";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("contractor_id", quoteContractor.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...data,
    business_snapshot: data.business_snapshot ?? buildBusinessSnapshot(quoteContractor),
    template_preset: data.template_preset ?? quoteContractor.quote_template_preset ?? "classic",
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const body = await request.json();
  let payload = body;

  if (Array.isArray(body.line_items)) {
    const { data: existingQuote } = await supabase
      .from("quotes")
      .select("trade")
      .eq("id", id)
      .eq("contractor_id", contractor.id)
      .single();

    const trade = (body.trade ?? existingQuote?.trade) as Trade;
    const calculated = calculateQuotePricing({
      line_items: body.line_items,
      tax_rate: body.tax_rate,
    });

    if (trade) {
      await learnEditedPrices({
        supabase,
        contractorId: contractor.id,
        trade,
        lineItems: calculated.line_items,
      });
    }

    payload = {
      ...body,
      ...calculated,
      pricing_source: determineQuotePricingSource(calculated.line_items),
      pricing_confidence: body.pricing_confidence ?? null,
    };
  }

  const { data, error } = await supabase
    .from("quotes")
    .update(payload)
    .eq("id", id)
    .eq("contractor_id", contractor.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
