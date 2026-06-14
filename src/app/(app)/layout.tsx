import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("business_name, email, trade, primary_trade")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <AppShell contractor={contractor}>
      {children}
    </AppShell>
  );
}
