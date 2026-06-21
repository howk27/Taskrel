import { NextResponse } from "next/server";
import { buildTaskrelExportRows, stringifyTaskrelCsv } from "@/lib/export-records";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!contractor?.id) return NextResponse.json({ error: "Complete onboarding before exporting records." }, { status: 404 });

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, client_name, client_email, client_phone, client_address, trade, status, total, created_at")
    .eq("contractor_id", contractor?.id)
    .order("created_at", { ascending: false });

  const { data: invoices } = await supabase
    .from("invoices")
    .select("invoice_number, client_name, client_email, status, total, amount_paid, due_date, paid_at, created_at")
    .eq("contractor_id", contractor?.id)
    .order("created_at", { ascending: false });

  const csv = stringifyTaskrelCsv(buildTaskrelExportRows({ quotes: quotes ?? [], invoices: invoices ?? [] }));
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="taskrel-export-${date}.csv"`,
    },
  });
}
