import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskrelSpreadsheet,
  exchangeGoogleCode,
  getGoogleSheetsMissingEnv,
} from "@/lib/google-sheets";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const missingEnv = getGoogleSheetsMissingEnv();

  if (missingEnv.length > 0) {
    return NextResponse.redirect(`${origin}/settings?google=not_configured`);
  }

  if (!code) return NextResponse.redirect(`${origin}/settings?google=missing_code`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, business_name")
    .eq("user_id", user.id)
    .single();

  if (!contractor) return NextResponse.redirect(`${origin}/settings?google=contractor_missing`);

  try {
    const token = await exchangeGoogleCode(code);
    if (!token.access_token || !token.refresh_token) {
      throw new Error(token.error_description ?? token.error ?? "Google did not return a refresh token.");
    }

    const sheetId = await createTaskrelSpreadsheet(token.access_token, contractor.business_name);

    await supabase
      .from("contractors")
      .update({
        google_sheets_refresh_token: token.refresh_token,
        google_sheets_sheet_id: sheetId,
        google_sheets_sync_enabled: true,
        google_sheets_status: "connected",
      })
      .eq("id", contractor.id);

    return NextResponse.redirect(`${origin}/settings?google=connected`);
  } catch (error) {
    console.error("Google Sheets callback error:", error);
    await supabase
      .from("contractors")
      .update({ google_sheets_status: "error", google_sheets_sync_enabled: false })
      .eq("id", contractor.id);

    return NextResponse.redirect(`${origin}/settings?google=error`);
  }
}
