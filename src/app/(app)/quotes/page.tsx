import { redirect } from "next/navigation";
import { QuotesWorkflow } from "@/components/quotes/quotes-workflow";
import { getCurrentWorkspace } from "@/lib/auth/workspace";

export default async function QuotesPage() {
  const { supabase, contractor } = await getCurrentWorkspace();

  if (!contractor) redirect("/onboarding");

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, client_name, client_address, client_email, client_phone, total, status, created_at, updated_at, scheduled_start, sent_via, line_items, notes")
    .eq("contractor_id", contractor.id)
    .order("created_at", { ascending: false });

  return <QuotesWorkflow quotes={quotes ?? []} />;
}
