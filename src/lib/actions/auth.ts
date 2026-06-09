"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const businessName = formData.get("business_name") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: { business_name: businessName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Update business name on the contractor row (created by DB trigger)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("contractors")
      .update({ business_name: businessName })
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

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trade = formData.get("trade") as string;

  const { error } = await supabase
    .from("contractors")
    .update({ trade, onboarding_complete: true })
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
