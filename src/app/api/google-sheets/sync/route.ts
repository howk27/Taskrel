import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGoogleSheetsMissingEnv,
  refreshGoogleAccessToken,
  syncRowsToGoogleSheet,
} from "@/lib/google-sheets";

function redirectToSettings(request: NextRequest, googleStatus: string) {
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/settings?google=${googleStatus}`, { status: 303 });
}

export async function POST(request: NextRequest) {
  const missingEnv = getGoogleSheetsMissingEnv();
  if (missingEnv.length > 0) return redirectToSettings(request, "not_configured");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectToSettings(request, "unauthorized");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, google_sheets_refresh_token, google_sheets_sheet_id")
    .eq("user_id", user.id)
    .single();

  if (!contractor?.google_sheets_refresh_token || !contractor.google_sheets_sheet_id) {
    return redirectToSettings(request, "disconnected");
  }

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, client_name, client_email, client_phone, client_address, trade, status, total, created_at")
    .eq("contractor_id", contractor.id)
    .order("created_at", { ascending: false });

  const { data: invoices } = await supabase
    .from("invoices")
    .select("invoice_number, client_name, client_email, status, total, amount_paid, due_date, paid_at, created_at")
    .eq("contractor_id", contractor.id)
    .order("created_at", { ascending: false });

  const rows: string[][] = [
    ["QUOTES"],
    ["ID", "Client", "Email", "Phone", "Address", "Trade", "Status", "Total", "Created"],
    ...(quotes ?? []).map((quote) => [
      quote.id,
      quote.client_name,
      quote.client_email ?? "",
      quote.client_phone ?? "",
      quote.client_address ?? "",
      quote.trade,
      quote.status,
      String(quote.total),
      quote.created_at,
    ]),
    [],
    ["INVOICES"],
    ["Invoice #", "Client", "Email", "Status", "Total", "Paid", "Due Date", "Paid At", "Created"],
    ...(invoices ?? []).map((invoice) => [
      invoice.invoice_number,
      invoice.client_name,
      invoice.client_email ?? "",
      invoice.status,
      String(invoice.total),
      String(invoice.amount_paid),
      invoice.due_date ?? "",
      invoice.paid_at ?? "",
      invoice.created_at,
    ]),
  ];

  try {
    const token = await refreshGoogleAccessToken(contractor.google_sheets_refresh_token);
    if (!token.access_token) throw new Error(token.error_description ?? token.error ?? "Google token refresh failed.");

    await syncRowsToGoogleSheet(token.access_token, contractor.google_sheets_sheet_id, rows);
    await supabase
      .from("contractors")
      .update({
        google_sheets_last_synced_at: new Date().toISOString(),
        google_sheets_status: "connected",
      })
      .eq("id", contractor.id);

    return redirectToSettings(request, "synced");
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    await supabase
      .from("contractors")
      .update({ google_sheets_status: "error" })
      .eq("id", contractor.id);

    return redirectToSettings(request, "error");
  }
}
