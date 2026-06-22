import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getCurrentWorkspace = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, onboarding_complete, business_name, email, trade, primary_trade")
    .eq("user_id", user.id)
    .maybeSingle();

  return { supabase, user, contractor };
});
