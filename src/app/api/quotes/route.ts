import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateQuotePricing, determineQuotePricingSource } from "@/lib/pricing";
import { buildPricingRecommendationSnapshot, normalizePropertyValuationSnapshot } from "@/lib/pricing-intelligence";
import { learnEditedPrices } from "@/lib/pricing-catalog";
import type { Trade } from "@/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractorSelect = "id, trade, primary_trade, trades, quote_template_preset, overhead_percent, overhead_fixed_per_job";
  const fallbackContractorSelect = "id, trade, primary_trade, trades, quote_template_preset";
  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select(contractorSelect)
    .eq("user_id", user.id)
    .single();
  const { data: fallbackContractor } = contractorError?.message.includes("overhead_")
    ? await supabase
      .from("contractors")
      .select(fallbackContractorSelect)
      .eq("user_id", user.id)
      .single()
    : { data: null };
  const quoteContractor = contractor ?? (fallbackContractor ? { ...fallbackContractor, overhead_percent: 0, overhead_fixed_per_job: 0 } : null);

  if (!quoteContractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const body = await request.json();

  const requestedTrade = body.trade ?? quoteContractor.primary_trade ?? quoteContractor.trade;
  const availableTrades = Array.isArray(quoteContractor.trades) ? quoteContractor.trades : [];
  const trade = availableTrades.length === 0 || availableTrades.includes(requestedTrade)
    ? requestedTrade
    : quoteContractor.primary_trade ?? quoteContractor.trade;
  const calculated = calculateQuotePricing({
    line_items: Array.isArray(body.line_items) ? body.line_items : [],
    tax_rate: body.tax_rate,
  });
  const pricingSource = determineQuotePricingSource(calculated.line_items);
  const propertyValuationSnapshot = normalizePropertyValuationSnapshot(
    body.property_valuation_snapshot,
    body.client_address
  );
  const pricingRecommendationSnapshot = buildPricingRecommendationSnapshot({
    subtotal: calculated.subtotal,
    overhead: quoteContractor,
    propertyValuation: propertyValuationSnapshot,
  });

  await learnEditedPrices({
    supabase,
    contractorId: quoteContractor.id,
    trade: trade as Trade,
    lineItems: calculated.line_items,
  });

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      ...body,
      ...calculated,
      contractor_id: quoteContractor.id,
      trade,
      pricing_source: pricingSource,
      pricing_confidence: body.pricing_confidence ?? null,
      property_valuation_snapshot: propertyValuationSnapshot,
      pricing_recommendation_snapshot: pricingRecommendationSnapshot,
      template_preset: body.template_preset ?? quoteContractor.quote_template_preset ?? "classic",
    })
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

  if (!contractor) return NextResponse.json([], { status: 200 });

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("contractor_id", contractor.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
