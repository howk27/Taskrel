"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BusinessType, QuoteTemplatePreset, Trade } from "@/types";

// Shared return type for all server actions used with useActionState.
// undefined = no state yet / success (redirect handles navigation).
export type ActionState =
  | {
      error: string;
      values?: Record<string, string>;
    }
  | undefined;

const businessTypes: BusinessType[] = [
  "home_improvement",
  "mechanical_services",
  "outdoor_services",
  "general_contracting",
  "other",
];
const tradesList: Trade[] = ["painting", "roofing", "flooring", "landscaping", "hvac", "plumbing", "electrical"];
const quoteTemplatePresets: QuoteTemplatePreset[] = ["classic", "modern", "compact"];

// Password rules: 8–72 chars, letters and numbers only.
// 72 is bcrypt's effective max — anything longer is silently truncated by Supabase.
function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 72) return "Password must be 72 characters or fewer.";
  if (!/^[a-zA-Z0-9]+$/.test(password))
    return "Password can only contain letters and numbers — no special characters.";
  return null;
}

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message, values: { email } };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");
  const values = { name, email };

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError, values };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: { business_name: name },
    },
  });

  if (error) {
    if (error.message === "Database error saving new user") {
      return {
        error:
          "Supabase could not create the contractor profile. Run supabase/migrations/003_fix_auth_signup_trigger.sql in the Supabase SQL Editor, then try again.",
        values,
      };
    }
    return { error: error.message, values };
  }

  // Sync name onto the contractor row created by the DB trigger.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("contractors")
      .update({ business_name: name })
      .eq("user_id", user.id);
  }

  redirect("/check-email");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function completeOnboarding(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const businessName = String(formData.get("business_name") ?? "").trim();
  const businessTypeInput = String(formData.get("business_type") ?? "") as BusinessType;
  const trades = formData.getAll("trades").map(String).filter(Boolean);
  const primaryTrade = String(formData.get("primary_trade") ?? trades[0] ?? "");
  const businessPhone = String(formData.get("business_phone") ?? "").trim();
  const businessWebsite = String(formData.get("business_website") ?? "").trim();
  const licenseText = String(formData.get("license_text") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const quoteTemplatePreset = String(formData.get("quote_template_preset") ?? "classic");
  const quoteDefaultNote = String(
    formData.get("quote_default_note") ?? ""
  ).trim();
  const quoteDefaultTerms = String(
    formData.get("quote_default_terms") ?? ""
  ).trim();
  const quotePolicyText = String(
    formData.get("quote_policy_text") ?? ""
  ).trim();
  const overheadEnabled = formData.get("overhead_enabled") === "on";
  const overheadPercent = overheadEnabled
    ? Number(formData.get("overhead_percent") ?? 0)
    : 0;
  const overheadFixed = overheadEnabled
    ? Number(formData.get("overhead_fixed_per_job") ?? 0)
    : 0;

  if (!businessName) return { error: "Add business name." };
  if (trades.length === 0 || trades.some((trade) => !tradesList.includes(trade as Trade))) {
    return { error: "Choose at least one valid service." };
  }
  const businessType = businessTypes.includes(businessTypeInput)
    ? businessTypeInput
    : inferBusinessType(trades as Trade[]);
  if (!primaryTrade || !trades.includes(primaryTrade)) {
    return { error: "Choose at least one valid service." };
  }
  if (!tradesList.includes(primaryTrade as Trade)) {
    return { error: "Choose at least one valid service." };
  }
  if (!quoteTemplatePresets.includes(quoteTemplatePreset as QuoteTemplatePreset)) {
    return { error: "Choose a valid quote template." };
  }
  if (
    !Number.isFinite(overheadPercent) ||
    overheadPercent < 0 ||
    overheadPercent > 100
  ) {
    return { error: "Overhead percent must be between 0 and 100." };
  }
  if (!Number.isFinite(overheadFixed) || overheadFixed < 0) {
    return { error: "Fixed overhead must be zero or more." };
  }

  const { error } = await supabase
    .from("contractors")
    .update({
      business_name: businessName,
      business_type: businessType,
      trade: primaryTrade as Trade,
      primary_trade: primaryTrade as Trade,
      trades,
      business_phone: businessPhone || null,
      business_website: businessWebsite || null,
      license_text: licenseText || null,
      logo_url: logoUrl || null,
      quote_template_preset: quoteTemplatePreset as QuoteTemplatePreset,
      quote_default_note: quoteDefaultNote || null,
      quote_default_terms: quoteDefaultTerms || null,
      quote_policy_text: quotePolicyText || null,
      overhead_percent: Math.round(overheadPercent * 1000) / 1000,
      overhead_fixed_per_job: Math.round(overheadFixed * 100) / 100,
      onboarding_complete: true,
    })
    .eq("user_id", user.id);

  if (
    error?.message.includes("quote_policy_text") ||
    error?.message.includes("overhead_")
  ) {
    return {
      error:
        "Run the latest Supabase migrations before completing onboarding.",
    };
  }

  if (error) return { error: error.message };

  revalidatePath("/onboarding");
  revalidatePath("/settings");
  revalidatePath("/quotes");
  redirect("/dashboard");
}

function inferBusinessType(trades: Trade[]): BusinessType {
  if (trades.some((trade) => trade === "hvac" || trade === "plumbing" || trade === "electrical")) return "mechanical_services";
  if (trades.includes("landscaping")) return "outdoor_services";
  if (trades.some((trade) => trade === "painting" || trade === "roofing" || trade === "flooring")) return "home_improvement";
  return "general_contracting";
}
