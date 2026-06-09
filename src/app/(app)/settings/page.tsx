import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { Badge, statusVariant } from "@/components/ui/badge";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("business_name, trade, email, subscription_status, stripe_connect_account_id, onboarding_complete")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-white">Settings</h1>

      {/* Account */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Account</h2>
        <div className="rounded-xl bg-[#1E293B] divide-y divide-slate-700/50">
          <div className="px-4 py-3">
            <p className="text-xs text-slate-400">Business</p>
            <p className="text-white text-sm">{contractor?.business_name}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-400">Email</p>
            <p className="text-white text-sm">{contractor?.email}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-400">Trade</p>
            <p className="text-white text-sm capitalize">{contractor?.trade}</p>
          </div>
        </div>
      </section>

      {/* Billing */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Billing</h2>
        <div className="rounded-xl bg-[#1E293B] divide-y divide-slate-700/50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Taskrel subscription</p>
              <p className="text-slate-400 text-xs">$19/month</p>
            </div>
            {contractor?.subscription_status ? (
              <Badge variant={statusVariant(contractor.subscription_status)}>
                {contractor.subscription_status}
              </Badge>
            ) : (
              <Link href="/settings/billing" className="text-[#F97316] text-sm font-medium">
                Subscribe
              </Link>
            )}
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Payment processing</p>
              <p className="text-slate-400 text-xs">Stripe Connect — accept client payments</p>
            </div>
            {contractor?.stripe_connect_account_id ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Link href="/settings/billing" className="text-[#F97316] text-sm font-medium">
                Set up
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Export */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Export</h2>
        <div className="rounded-xl bg-[#1E293B] divide-y divide-slate-700/50">
          <Link href="/api/export/csv" className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors">
            <p className="text-white text-sm">Download CSV</p>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Sign out */}
      <form action={logout}>
        <button type="submit" className="w-full text-center text-sm text-red-400 py-3 hover:text-red-300 transition-colors">
          Sign out
        </button>
      </form>
    </div>
  );
}
