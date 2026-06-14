import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildTaskrelInsights } from "@/lib/insights";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });

  const [quotes, invoices, jobs, clients] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, client_name, total, status, created_at, scheduled_start")
      .eq("contractor_id", contractor.id),
    supabase
      .from("invoices")
      .select("id, client_name, total, amount_paid, status, due_date, paid_at, created_at")
      .eq("contractor_id", contractor.id),
    supabase
      .from("jobs")
      .select("id, title, status, scheduled_start")
      .eq("contractor_id", contractor.id),
    supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("contractor_id", contractor.id),
  ]);

  if (quotes.error || invoices.error || jobs.error || clients.error) {
    return NextResponse.json(
      { error: quotes.error?.message ?? invoices.error?.message ?? jobs.error?.message ?? clients.error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    buildTaskrelInsights({
      quotes: quotes.data ?? [],
      invoices: invoices.data ?? [],
      jobs: jobs.data ?? [],
      clients: clients.data ?? [],
    })
  );
}
