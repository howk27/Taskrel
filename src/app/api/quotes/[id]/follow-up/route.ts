import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function nextFollowUpDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return date.toISOString();
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("quotes")
    .update({
      last_followed_up_at: now,
      follow_up_due_at: nextFollowUpDate(),
    })
    .eq("id", id)
    .eq("contractor_id", contractor.id)
    .eq("status", "sent")
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  return NextResponse.json(data);
}
