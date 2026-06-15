import { NextResponse } from "next/server";
import { getConfiguredEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function configuredCodes() {
  return new Set(
    (getConfiguredEnv("TASKREL_PREMIUM_ACCESS_CODES") ?? "")
      .split(/[\s,;]+/)
      .map(code => code.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function POST(request: Request) {
  const codes = configuredCodes();
  if (codes.size === 0) {
    return NextResponse.json(
      { error: "Closed-test access codes are not configured." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await request.json().catch(() => ({ code: "" }));
  const normalizedCode = String(code ?? "").trim().toLowerCase();

  if (!normalizedCode || !codes.has(normalizedCode)) {
    return NextResponse.json({ error: "That access code is not valid." }, { status: 400 });
  }

  const { error } = await supabase
    .from("contractors")
    .update({ subscription_status: "trialing" })
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to redeem premium access code:", error);
    return NextResponse.json({ error: "Could not unlock access. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    subscription_status: "trialing",
  });
}
