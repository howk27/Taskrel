import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, address, created_at")
    .eq("contractor_id", contractor?.id)
    .order("name", { ascending: true });

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold text-white mb-6">Clients</h1>

      {clients && clients.length > 0 ? (
        <div className="rounded-xl bg-[#1E293B] divide-y divide-slate-700/50">
          {clients.map(c => (
            <div key={c.id} className="px-4 py-4">
              <p className="text-white font-medium text-sm">{c.name}</p>
              {c.email && <p className="text-slate-400 text-xs">{c.email}</p>}
              {c.phone && <p className="text-slate-400 text-xs">{c.phone}</p>}
              {c.address && <p className="text-slate-500 text-xs mt-0.5">{c.address}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[#1E293B] p-10 text-center">
          <p className="text-white font-medium mb-1">No clients yet</p>
          <p className="text-slate-400 text-sm">Clients are added automatically when you send a quote.</p>
          <Link href="/quotes/new" className="inline-block mt-4 text-[#F97316] text-sm font-medium">
            Create a quote →
          </Link>
        </div>
      )}
    </div>
  );
}
