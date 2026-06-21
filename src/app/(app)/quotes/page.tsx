import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QuotesWorkflow } from "@/components/quotes/quotes-workflow";

export default async function QuotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!contractor) redirect("/onboarding");

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, client_name, client_address, client_email, client_phone, total, status, created_at, updated_at, scheduled_start, sent_via, line_items, notes, follow_up_due_at, last_followed_up_at")
    .eq("contractor_id", contractor.id)
    .order("created_at", { ascending: false });

  return <QuotesWorkflow quotes={quotes ?? []} />;
}
