import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { Badge, statusVariant } from "@/components/ui/badge";
import { DownloadSimple, FileText, Gear, Receipt } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { QuoteDocumentSettingsForm } from "@/components/settings/quote-document-settings-form";
import Link from "next/link";

function googleNotice(status?: string) {
  switch (status) {
    case "not_configured":
      return "Google Sheets is waiting for Google OAuth keys.";
    case "connected":
      return "Google Sheets connected.";
    case "synced":
      return "Google Sheet synced.";
    case "disconnected":
      return "Google Sheets disconnected.";
    case "error":
      return "Google Sheets needs attention. Try reconnecting.";
    default:
      return null;
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ google?: string }>;
}) {
  const params = await searchParams;
  const googleMessage = googleNotice(params?.google);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("business_name, trade, email, subscription_status, stripe_connect_account_id, onboarding_complete, google_sheets_sync_enabled, google_sheets_sheet_id, google_sheets_last_synced_at, google_sheets_status, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_template_preset")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Account, quote documents, billing, and exports."
      />

      {/* Account */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Gear size={16} weight="duotone" className="text-[#F97316]" />
          Account
        </h2>
        <div className="rounded-lg border border-slate-700/70 bg-[#172235] divide-y divide-slate-700/50">
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

      {/* Quote documents */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <FileText size={16} weight="duotone" className="text-[#F97316]" />
          Quote documents
        </h2>
        {contractor && (
          <QuoteDocumentSettingsForm
            contractor={{
              logo_url: contractor.logo_url,
              business_phone: contractor.business_phone,
              business_website: contractor.business_website,
              license_text: contractor.license_text,
              quote_default_terms: contractor.quote_default_terms,
              quote_default_note: contractor.quote_default_note,
              quote_template_preset: contractor.quote_template_preset,
            }}
          />
        )}
      </section>

      {/* Billing */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Receipt size={16} weight="duotone" className="text-[#F97316]" />
          Billing
        </h2>
        <div className="rounded-lg border border-slate-700/70 bg-[#172235] divide-y divide-slate-700/50">
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
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <DownloadSimple size={16} weight="duotone" className="text-[#F97316]" />
          Export
        </h2>
        <div className="rounded-lg border border-slate-700/70 bg-[#172235] divide-y divide-slate-700/50">
          <Link href="/api/export/csv" className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors">
            <p className="text-white text-sm">Download CSV</p>
            <DownloadSimple size={18} className="text-slate-400" />
          </Link>
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white text-sm">Google Sheets sync</p>
                <p className="text-slate-400 text-xs">
                  {contractor?.google_sheets_last_synced_at
                    ? `Last synced ${new Date(contractor.google_sheets_last_synced_at).toLocaleString()}`
                    : "Optional live spreadsheet export"}
                </p>
              </div>
              <Badge variant={contractor?.google_sheets_status === "connected" ? "success" : contractor?.google_sheets_status === "error" ? "error" : "default"}>
                {contractor?.google_sheets_status ?? "disconnected"}
              </Badge>
            </div>
            {googleMessage && <p className="text-xs text-slate-300">{googleMessage}</p>}
            {contractor?.google_sheets_sync_enabled && contractor.google_sheets_sheet_id ? (
              <div className="grid grid-cols-2 gap-2">
                <form action="/api/google-sheets/sync" method="post">
                  <button type="submit" className="w-full rounded-lg bg-[#F97316] px-3 py-2 text-sm font-semibold text-white hover:bg-[#EA6C0A]">
                    Sync now
                  </button>
                </form>
                <form action="/api/google-sheets/disconnect" method="post">
                  <button type="submit" className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600">
                    Disconnect
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/api/google-sheets/connect" className="block w-full rounded-lg bg-slate-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-600">
                Connect Google Sheets
              </Link>
            )}
          </div>
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
