import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge, statusVariant } from "@/components/ui/badge";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_name, total, amount_paid, status, due_date, created_at")
    .eq("contractor_id", contractor?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold text-white mb-6">Invoices</h1>

      {invoices && invoices.length > 0 ? (
        <div className="rounded-xl bg-[#1E293B] divide-y divide-slate-700/50">
          {invoices.map(inv => (
            <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-start justify-between px-4 py-4 hover:bg-slate-700/30 transition-colors">
              <div>
                <p className="text-white text-sm font-medium">{inv.client_name}</p>
                <p className="text-slate-500 text-xs">{inv.invoice_number}</p>
                {inv.due_date && <p className="text-slate-500 text-xs">Due {new Date(inv.due_date).toLocaleDateString()}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                <p className="text-white font-semibold text-sm">${inv.total.toFixed(2)}</p>
                <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[#1E293B] p-10 text-center">
          <p className="text-white font-medium mb-1">No invoices yet</p>
          <p className="text-slate-400 text-sm">Approve a quote to convert it into an invoice.</p>
          <Link href="/quotes" className="inline-block mt-4 text-[#F97316] text-sm font-medium">
            View quotes →
          </Link>
        </div>
      )}
    </div>
  );
}
