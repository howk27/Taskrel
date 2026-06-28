import { redirect } from "next/navigation";
import { QuotesWorkflow } from "@/components/quotes/quotes-workflow";
import { getCurrentWorkspace } from "@/lib/auth/workspace";

type QuotesSearchParams = {
  page?: string;
  q?: string;
};

const QUOTES_PAGE_SIZE = 50;

export default async function QuotesPage({ searchParams }: { searchParams?: Promise<QuotesSearchParams> }) {
  const params = await searchParams;
  const { supabase, contractor } = await getCurrentWorkspace();

  if (!contractor) redirect("/onboarding");

  const page = parsePage(params?.page);
  const query = normalizeQuery(params?.q);
  const from = (page - 1) * QUOTES_PAGE_SIZE;
  const to = from + QUOTES_PAGE_SIZE - 1;

  let quotesQuery = supabase
    .from("quotes")
    .select("id, client_name, client_address, client_email, client_phone, total, status, created_at, updated_at, scheduled_start, sent_via, line_items, notes, follow_up_due_at, last_followed_up_at", { count: "exact" })
    .eq("contractor_id", contractor.id)
    .order("created_at", { ascending: false });

  if (query) {
    const term = escapeSupabaseSearch(query);
    quotesQuery = quotesQuery.or([
      `client_name.ilike.%${term}%`,
      `client_address.ilike.%${term}%`,
      `client_email.ilike.%${term}%`,
      `client_phone.ilike.%${term}%`,
      `status.ilike.%${term}%`,
    ].join(","));
  }

  const { data: quotes, count } = await quotesQuery.range(from, to);

  return (
    <QuotesWorkflow
      quotes={quotes ?? []}
      initialSearch={query}
      pagination={{
        page,
        pageSize: QUOTES_PAGE_SIZE,
        total: count ?? 0,
        basePath: "/quotes",
        query,
      }}
      workflowNowIso={new Date().toISOString()}
    />
  );
}

function parsePage(value?: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function normalizeQuery(value?: string) {
  return value?.trim().slice(0, 80) ?? "";
}

function escapeSupabaseSearch(value: string) {
  return value.replace(/[%_,]/g, " ");
}
