import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Badge, statusVariant } from "@/components/ui/badge";
import { DownloadSimple, FileText, Gear, Receipt } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { OverheadSettingsForm } from "@/components/settings/overhead-settings-form";
import { QuoteDocumentSettingsForm } from "@/components/settings/quote-document-settings-form";
import { logout } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

function googleNotice(status?: string) {
  switch (status) {
    case "not_configured":
      return "Spreadsheet export is waiting for Google OAuth keys.";
    case "connected":
      return "Spreadsheet export connected.";
    case "synced":
      return "Spreadsheet exported.";
    case "disconnected":
      return "Spreadsheet export disconnected.";
    case "error":
      return "Spreadsheet export needs attention. Try reconnecting.";
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

  const contractorSelect = "business_name, trade, email, subscription_status, stripe_connect_account_id, google_sheets_sync_enabled, google_sheets_sheet_id, google_sheets_last_synced_at, google_sheets_status, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_policy_text, quote_template_preset, overhead_percent, overhead_fixed_per_job";
  const fallbackContractorSelect = "business_name, trade, email, subscription_status, stripe_connect_account_id, google_sheets_sync_enabled, google_sheets_sheet_id, google_sheets_last_synced_at, google_sheets_status, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_template_preset";
  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select(contractorSelect)
    .eq("user_id", user.id)
    .single();
  const needsFallbackContractor = contractorError?.message.includes("quote_policy_text") || contractorError?.message.includes("overhead_");
  const { data: fallbackContractor } = needsFallbackContractor
    ? await supabase
      .from("contractors")
      .select(fallbackContractorSelect)
      .eq("user_id", user.id)
      .single()
    : { data: null };
  const settingsContractor = contractor ?? (fallbackContractor ? { ...fallbackContractor, quote_policy_text: null, overhead_percent: 0, overhead_fixed_per_job: 0 } : null);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Settings"
        subtitle="Account, quote documents, online payments, and spreadsheet export."
      />

      <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Settings sections">
        <SettingsJump href="#account" icon={<Gear size={18} weight="duotone" />} label="Account" detail="Business info and overhead" />
        <SettingsJump href="#quote-documents" icon={<FileText size={18} weight="duotone" />} label="Quote documents" detail="Logo, terms, and defaults" />
        <SettingsJump href="#payments" icon={<Receipt size={18} weight="duotone" />} label="Online payments" detail="Subscription and client pay links" />
        <SettingsJump href="#export" icon={<DownloadSimple size={18} weight="duotone" />} label="Spreadsheet export" detail="CSV and spreadsheet connection" />
      </nav>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section id="account" className="scroll-mt-24">
            <SectionTitle icon={<Gear size={17} weight="duotone" />} label="Account" tone="text-[var(--tr-blue)]" />
            <Surface className="divide-y divide-slate-700/50 overflow-hidden">
              <SettingRow label="Business" value={settingsContractor?.business_name ?? "Taskrel business"} />
              <SettingRow label="Email" value={settingsContractor?.email ?? user.email ?? ""} />
              <SettingRow label="Trade" value={settingsContractor?.trade ?? "Not set"} capitalize />
            </Surface>
            {settingsContractor && (
              <div className="mt-4">
                <OverheadSettingsForm
                  overheadPercent={settingsContractor.overhead_percent}
                  overheadFixedPerJob={settingsContractor.overhead_fixed_per_job}
                />
              </div>
            )}
          </section>

          <section id="quote-documents" className="scroll-mt-24">
            <SectionTitle icon={<FileText size={17} weight="duotone" />} label="Quote documents" tone="text-[var(--tr-amber)]" />
            {settingsContractor && (
              <QuoteDocumentSettingsForm
                contractor={{
                  logo_url: settingsContractor.logo_url,
                  business_phone: settingsContractor.business_phone,
                  business_website: settingsContractor.business_website,
                  license_text: settingsContractor.license_text,
                  quote_default_terms: settingsContractor.quote_default_terms,
                  quote_default_note: settingsContractor.quote_default_note,
                  quote_policy_text: settingsContractor.quote_policy_text,
                  quote_template_preset: settingsContractor.quote_template_preset,
                }}
              />
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section id="payments" className="scroll-mt-24">
            <SectionTitle icon={<Receipt size={17} weight="duotone" />} label="Online payments" tone="text-[var(--tr-green)]" />
            <Surface className="divide-y divide-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm text-white">Taskrel subscription</p>
                  <p className="text-xs text-slate-400">$19/month</p>
                </div>
                {settingsContractor?.subscription_status ? (
                  <Badge variant={statusVariant(settingsContractor.subscription_status)}>
                    {settingsContractor.subscription_status}
                  </Badge>
                ) : (
                  <Link href="/settings/billing" className="text-sm font-medium text-[var(--tr-blue)]">
                    Subscribe
                  </Link>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm text-white">Client online payments</p>
                  <p className="text-xs text-slate-400">Connect payments before sending payment links</p>
                </div>
                {settingsContractor?.stripe_connect_account_id ? (
                  <Badge variant="success">Connected</Badge>
                ) : (
                  <Link href="/settings/billing" className="text-sm font-medium text-[var(--tr-blue)]">
                    Set up
                  </Link>
                )}
              </div>
            </Surface>
          </section>

          <section id="export" className="scroll-mt-24">
            <SectionTitle icon={<DownloadSimple size={17} weight="duotone" />} label="Spreadsheet export" tone="text-[var(--tr-violet)]" />
            <Surface className="divide-y divide-slate-700/50 overflow-hidden">
              <Link href="/api/export/csv" className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-700/30">
                <p className="text-sm text-white">Download CSV</p>
                <DownloadSimple size={18} className="text-slate-400" />
              </Link>
              <div className="space-y-3 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white">Spreadsheet export</p>
                    <p className="text-xs text-slate-400">
                      {settingsContractor?.google_sheets_last_synced_at
                        ? `Last synced ${new Date(settingsContractor.google_sheets_last_synced_at).toLocaleString()}`
                        : "Optional spreadsheet export"}
                    </p>
                  </div>
                  <Badge variant={settingsContractor?.google_sheets_status === "connected" ? "success" : settingsContractor?.google_sheets_status === "error" ? "error" : "default"}>
                    {settingsContractor?.google_sheets_status ?? "disconnected"}
                  </Badge>
                </div>
                {googleMessage && <p className="text-xs text-slate-300">{googleMessage}</p>}
                {settingsContractor?.google_sheets_sync_enabled && settingsContractor.google_sheets_sheet_id ? (
                  <div className="grid grid-cols-2 gap-2">
                    <form action="/api/google-sheets/sync" method="post">
                      <button type="submit" className="w-full rounded-lg bg-[var(--tr-blue)] px-3 py-2 text-sm font-semibold text-[#09204f] hover:bg-[#a9c6ff]">
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
                    Connect spreadsheet export
                  </Link>
                )}
              </div>
            </Surface>
          </section>

          <form action={logout}>
            <button type="submit" className="w-full rounded-xl border border-red-400/20 bg-red-500/10 py-3 text-center text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, label, tone }: { icon: ReactNode; label: string; tone: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      <span className={tone}>{icon}</span>
      {label}
    </h2>
  );
}

function SettingsJump({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <a href={href} className="rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-4 transition-colors hover:bg-[var(--tr-surface-2)]">
      <span className="text-[var(--tr-blue)]">{icon}</span>
      <span className="mt-3 block text-sm font-bold text-white">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-[var(--tr-text-muted)]">{detail}</span>
    </a>
  );
}

function SettingRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm text-white ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}
