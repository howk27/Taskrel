import { NextRequest, NextResponse } from "next/server";
import { buildTaskrelExportRows } from "@/lib/export-records";
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

  const rows = buildTaskrelExportRows({ quotes: quotes ?? [], invoices: invoices ?? [] });

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
