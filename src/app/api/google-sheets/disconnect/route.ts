import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`, { status: 303 });

  await supabase
    .from("contractors")
    .update({
      google_sheets_sync_enabled: false,
      google_sheets_refresh_token: null,
      google_sheets_sheet_id: null,
      google_sheets_last_synced_at: null,
      google_sheets_status: "disconnected",
    })
    .eq("user_id", user.id);

  return NextResponse.redirect(`${origin}/settings?google=disconnected`, { status: 303 });
}
