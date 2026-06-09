import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, client_name, client_address, total, status, created_at, sent_via")
    .eq("contractor_id", contractor?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-white">Quotes</h1>
        <Link
          href="/quotes/new"
          className="flex items-center gap-1.5 bg-[#F97316] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#EA6C0A]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New
        </Link>
      </div>

      {quotes && quotes.length > 0 ? (
        <div className="rounded-xl bg-[#1E293B] divide-y divide-slate-700/50">
          {quotes.map(q => (
            <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-start justify-between px-4 py-4 hover:bg-slate-700/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{q.client_name}</p>
                {q.client_address && <p className="text-slate-500 text-xs truncate">{q.client_address}</p>}
                <p className="text-slate-500 text-xs mt-0.5">{new Date(q.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                <p className="text-white font-semibold text-sm">${q.total.toFixed(2)}</p>
                <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[#1E293B] p-10 text-center">
          <p className="text-white font-medium mb-1">No quotes yet</p>
          <p className="text-slate-400 text-sm mb-4">Create your first quote in under 2 minutes.</p>
          <Link href="/quotes/new" className="inline-flex items-center gap-2 bg-[#F97316] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#EA6C0A]">
            Create Quote
          </Link>
        </div>
      )}
    </div>
  );
}
