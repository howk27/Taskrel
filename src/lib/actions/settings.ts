"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BusinessType, QuoteTemplatePreset, Trade } from "@/types";

export type SettingsActionState = { error?: string; success?: string } | undefined;

const presets: QuoteTemplatePreset[] = ["classic", "modern", "compact"];
const businessTypes: BusinessType[] = [
  "home_improvement",
  "mechanical_services",
  "outdoor_services",
  "general_contracting",
  "other",
];
const trades: Trade[] = ["painting", "roofing", "flooring", "landscaping", "hvac", "plumbing", "electrical"];

export async function updateBusinessInformation(
  _: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in again." };

  const businessName = String(formData.get("business_name") ?? "").trim();
  const selectedTrades = formData.getAll("trades").map(String).filter(Boolean) as Trade[];
  const businessTypeInput = String(formData.get("business_type") ?? "") as BusinessType;
  const businessType = businessTypes.includes(businessTypeInput)
    ? businessTypeInput
    : inferBusinessType(selectedTrades);
  const primaryTrade = String(formData.get("primary_trade") ?? selectedTrades[0] ?? "") as Trade;

  if (!businessName) return { error: "Add business name." };
  if (selectedTrades.length === 0 || selectedTrades.some((trade) => !trades.includes(trade))) {
    return { error: "Choose at least one valid service." };
  }
  if (!primaryTrade || !selectedTrades.includes(primaryTrade)) {
    return { error: "Choose at least one valid service." };
  }

  const { error } = await supabase
    .from("contractors")
    .update({
      business_name: businessName,
      business_type: businessType,
      trade: primaryTrade,
      primary_trade: primaryTrade,
      trades: selectedTrades,
      business_phone: String(formData.get("business_phone") ?? "").trim() || null,
      business_website: String(formData.get("business_website") ?? "").trim() || null,
      license_text: String(formData.get("license_text") ?? "").trim() || null,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/onboarding");
  revalidatePath("/quotes");
  return { success: "Business information saved." };
}

function inferBusinessType(selectedTrades: Trade[]): BusinessType {
  if (selectedTrades.some((trade) => trade === "hvac" || trade === "plumbing" || trade === "electrical")) return "mechanical_services";
  if (selectedTrades.includes("landscaping")) return "outdoor_services";
  if (selectedTrades.some((trade) => trade === "painting" || trade === "roofing" || trade === "flooring")) return "home_improvement";
  return "general_contracting";
}

export async function updateQuoteSettings(
  _: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in again." };

  const preset = String(formData.get("quote_template_preset") ?? "classic") as QuoteTemplatePreset;
  if (!presets.includes(preset)) {
    return { error: "Choose a valid quote template." };
  }

  const payload = {
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    business_phone: String(formData.get("business_phone") ?? "").trim() || null,
    business_website: String(formData.get("business_website") ?? "").trim() || null,
    license_text: String(formData.get("license_text") ?? "").trim() || null,
    quote_default_terms: String(formData.get("quote_default_terms") ?? "").trim() || null,
    quote_default_note: String(formData.get("quote_default_note") ?? "").trim() || null,
    quote_policy_text: String(formData.get("quote_policy_text") ?? "").trim() || null,
    quote_template_preset: preset,
  };

  const { error } = await supabase
    .from("contractors")
    .update(payload)
    .eq("user_id", user.id);

  if (error?.message.includes("quote_policy_text")) {
    const fallbackPayload = {
      logo_url: payload.logo_url,
      business_phone: payload.business_phone,
      business_website: payload.business_website,
      license_text: payload.license_text,
      quote_default_terms: payload.quote_default_terms,
      quote_default_note: payload.quote_default_note,
      quote_template_preset: payload.quote_template_preset,
    };
    const { error: fallbackError } = await supabase
      .from("contractors")
      .update(fallbackPayload)
      .eq("user_id", user.id);

    if (fallbackError) return { error: fallbackError.message };
    revalidatePath("/settings");
    revalidatePath("/quotes");
    return { success: "Quote settings saved. Run the latest Supabase migration to save policies and warranty text." };
  }

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/quotes");
  return { success: "Quote settings saved." };
}

export async function updateOverheadSettings(
  _: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in again." };

  const overheadPercent = Number(formData.get("overhead_percent") ?? 0);
  const overheadFixed = Number(formData.get("overhead_fixed_per_job") ?? 0);

  if (!Number.isFinite(overheadPercent) || overheadPercent < 0 || overheadPercent > 100) {
    return { error: "Overhead percent must be between 0 and 100." };
  }

  if (!Number.isFinite(overheadFixed) || overheadFixed < 0) {
    return { error: "Fixed overhead must be zero or more." };
  }

  const { error } = await supabase
    .from("contractors")
    .update({
      overhead_percent: Math.round(overheadPercent * 1000) / 1000,
      overhead_fixed_per_job: Math.round(overheadFixed * 100) / 100,
    })
    .eq("user_id", user.id);

  if (error?.message.includes("overhead_")) {
    return { error: "Run the latest Supabase migration before saving overhead settings." };
  }

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/quotes");
  return { success: "Overhead settings saved." };
}
