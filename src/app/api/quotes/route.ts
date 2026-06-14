import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, trade, primary_trade, trades, quote_template_preset")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const body = await request.json();

  const requestedTrade = body.trade ?? contractor.primary_trade ?? contractor.trade;
  const availableTrades = Array.isArray(contractor.trades) ? contractor.trades : [];
  const trade = availableTrades.length === 0 || availableTrades.includes(requestedTrade)
    ? requestedTrade
    : contractor.primary_trade ?? contractor.trade;

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      ...body,
      contractor_id: contractor.id,
      trade,
      template_preset: body.template_preset ?? contractor.quote_template_preset ?? "classic",
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
