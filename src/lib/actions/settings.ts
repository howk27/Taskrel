"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { QuoteTemplatePreset } from "@/types";

export type SettingsActionState = { error?: string; success?: string } | undefined;

const presets: QuoteTemplatePreset[] = ["classic", "modern", "compact"];

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
    quote_template_preset: preset,
  };

  const { error } = await supabase
    .from("contractors")
    .update(payload)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/quotes");
  return { success: "Quote settings saved." };
}
