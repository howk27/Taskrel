import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleSheetsAuthUrl, getGoogleSheetsMissingEnv } from "@/lib/google-sheets";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const missingEnv = getGoogleSheetsMissingEnv();
  if (missingEnv.length > 0) {
    return NextResponse.redirect(`${origin}/settings?google=not_configured`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  return NextResponse.redirect(buildGoogleSheetsAuthUrl(user.id));
}
