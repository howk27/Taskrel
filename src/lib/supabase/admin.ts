import { createClient } from "@supabase/supabase-js";
import { getConfiguredEnv } from "@/lib/env";

export function createAdminClient() {
  const supabaseUrl = getConfiguredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getConfiguredEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin client is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
