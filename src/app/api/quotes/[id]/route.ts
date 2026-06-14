import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBusinessSnapshot } from "@/lib/quote-document";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, business_name, email, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_template_preset")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("contractor_id", contractor.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...data,
    business_snapshot: data.business_snapshot ?? buildBusinessSnapshot(contractor),
    template_preset: data.template_preset ?? contractor.quote_template_preset ?? "classic",
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
  const { data, error } = await supabase
    .from("quotes")
    .update(body)
    .eq("id", id)
    .eq("contractor_id", contractor.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
