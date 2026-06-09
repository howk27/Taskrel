import { NextResponse } from "next/server";
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

  const rows: string[] = [];

  // Quotes sheet
  rows.push("QUOTES");
  rows.push("ID,Client,Email,Phone,Address,Trade,Status,Total,Created");
  quotes?.forEach(q => {
    rows.push([q.id, q.client_name, q.client_email ?? "", q.client_phone ?? "", q.client_address ?? "", q.trade, q.status, q.total, q.created_at].map(v => `"${v}"`).join(","));
  });

  rows.push("");
  rows.push("INVOICES");
  rows.push("Invoice #,Client,Email,Status,Total,Paid,Due Date,Paid At,Created");
  invoices?.forEach(i => {
    rows.push([i.invoice_number, i.client_name, i.client_email ?? "", i.status, i.total, i.amount_paid, i.due_date ?? "", i.paid_at ?? "", i.created_at].map(v => `"${v}"`).join(","));
  });

  const csv = rows.join("\n");
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="taskrel-export-${date}.csv"`,
    },
  });
}
