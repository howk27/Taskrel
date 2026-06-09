import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Redirect to onboarding if not complete (except when already on onboarding)
  const { data: contractor } = await supabase
    .from("contractors")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A] text-white">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
