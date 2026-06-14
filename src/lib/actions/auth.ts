"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Shared return type for all server actions used with useActionState.
// undefined = no state yet / success (redirect handles navigation).
export type ActionState =
  | {
      error: string;
      values?: Record<string, string>;
    }
  | undefined;

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

  const businessType = String(formData.get("business_type") ?? "");
  const primaryTrade = String(formData.get("primary_trade") ?? "");
  const trades = formData.getAll("trades").map(String).filter(Boolean);

  if (!businessType) return { error: "Choose a business type." };
  if (trades.length === 0) return { error: "Choose at least one trade." };
  if (!primaryTrade || !trades.includes(primaryTrade)) {
    return { error: "Choose a primary trade." };
  }

  const { error } = await supabase
    .from("contractors")
    .update({
      business_type: businessType,
      trade: primaryTrade,
      primary_trade: primaryTrade,
      trades,
      onboarding_complete: true,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  redirect("/dashboard");
}
