import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: deliveryEvents } = await supabase
    .from("delivery_events")
    .select("*")
    .eq("contractor_id", data.contractor_id)
    .eq("entity_type", "invoice")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(12);

  return NextResponse.json({
    ...data,
    delivery_events: deliveryEvents ?? [],
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

  // Drop server-managed / identity fields a client must never set directly.
  // stripe_payment_link is set server-side at send time; allowing the client to
  // write it enables a javascript:-scheme link to reach the rendered PDF/email.
  const PROTECTED = new Set([
    "id",
    "contractor_id",
    "stripe_payment_link",
    "stripe_payment_intent_id",
    "created_at",
    "updated_at",
  ]);
  const body = await request.json();
  const safe = Object.fromEntries(
    Object.entries(body ?? {}).filter(([key]) => !PROTECTED.has(key)),
  );

  const { data, error } = await supabase
    .from("invoices")
    .update(safe)
    .eq("id", id)
    .eq("contractor_id", contractor.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
