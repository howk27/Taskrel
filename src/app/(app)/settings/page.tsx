import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DownloadSimple, FileText, Gear, Receipt } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ReadinessChip } from "@/components/ui/readiness";
import { Surface } from "@/components/ui/surface";
import { BusinessInformationForm } from "@/components/settings/business-information-form";
import { DeleteAccount } from "@/components/settings/delete-account";
import { OverheadSettingsForm } from "@/components/settings/overhead-settings-form";
import { QuoteDocumentSettingsForm } from "@/components/settings/quote-document-settings-form";
import { logout } from "@/lib/actions/auth";
import { getCurrentWorkspace } from "@/lib/auth/workspace";
import { getMissingEnv } from "@/lib/env";

import { getSettingsBillingReadiness } from "./billing-summary";

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
  const { supabase, user } = await getCurrentWorkspace();

  const contractorSelect = "business_name, business_type, trade, primary_trade, trades, email, subscription_status, stripe_connect_account_id, google_sheets_sync_enabled, google_sheets_sheet_id, google_sheets_last_synced_at, google_sheets_status, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_policy_text, quote_template_preset, overhead_percent, overhead_fixed_per_job";
  const fallbackContractorSelect = "business_name, business_type, trade, primary_trade, trades, email, subscription_status, stripe_connect_account_id, google_sheets_sync_enabled, google_sheets_sheet_id, google_sheets_last_synced_at, google_sheets_status, logo_url, business_phone, business_website, license_text, quote_default_terms, quote_default_note, quote_template_preset";
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
  const billingReadiness = getSettingsBillingReadiness({
    subscription_status: settingsContractor?.subscription_status ?? null,
    stripe_connect_account_id: settingsContractor?.stripe_connect_account_id ?? null,
    billingConfigured: getMissingEnv(["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "NEXT_PUBLIC_APP_URL"]).length === 0,
    connectConfigured: getMissingEnv(["STRIPE_SECRET_KEY", "NEXT_PUBLIC_APP_URL"]).length === 0,
  });
  const subscriptionReadiness = billingReadiness.find(item => item.key === "subscription");
  const paymentProcessingReadiness = billingReadiness.find(item => item.key === "payment_processing");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        title="Settings"
        subtitle="Account, quote documents, billing, and exports."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section>
            <SectionTitle icon={<Gear size={17} weight="duotone" />} label="Account" tone="text-[var(--tr-primary)]" />
            <Surface className="overflow-hidden">
              <SettingRow label="Email" value={settingsContractor?.email ?? user.email ?? ""} />
            </Surface>
            {settingsContractor && (
              <div className="mt-4">
                <BusinessInformationForm
                  contractor={{
                    business_name: settingsContractor.business_name,
                    business_type: settingsContractor.business_type,
                    trade: settingsContractor.trade,
                    primary_trade: settingsContractor.primary_trade,
                    trades: settingsContractor.trades ?? [],
                    business_phone: settingsContractor.business_phone,
                    business_website: settingsContractor.business_website,
                    license_text: settingsContractor.license_text,
                  }}
                />
              </div>
            )}
            {settingsContractor && (
              <div className="mt-4">
                <OverheadSettingsForm
                  overheadPercent={settingsContractor.overhead_percent}
                  overheadFixedPerJob={settingsContractor.overhead_fixed_per_job}
                />
              </div>
            )}
          </section>

          <section>
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
          <section>
            <SectionTitle icon={<Receipt size={17} weight="duotone" />} label="Billing" tone="text-[var(--tr-green)]" />
            <Surface className="divide-y divide-[var(--tr-border-soft)] overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm text-[var(--tr-text)]">Taskrel subscription</p>
                  <p className="text-sm text-[var(--tr-text-muted)]">$19/month</p>
                </div>
                {settingsContractor?.subscription_status && subscriptionReadiness ? (
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(settingsContractor.subscription_status)}>
                      {settingsContractor.subscription_status}
                    </Badge>
                    <ReadinessChip state={subscriptionReadiness.state} />
                  </div>
                ) : (
                  subscriptionReadiness && (
                    <div className="flex items-center gap-2">
                      <Link href="/settings/billing" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--tr-primary)] hover:bg-[var(--tr-surface-2)]">
                        Subscribe
                      </Link>
                      <ReadinessChip state={subscriptionReadiness.state} />
                    </div>
                  )
                )}
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm text-[var(--tr-text)]">Payment processing</p>
                  <p className="text-sm text-[var(--tr-text-muted)]">Stripe Connect - accept client payments</p>
                </div>
                {settingsContractor?.stripe_connect_account_id && paymentProcessingReadiness ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Connected</Badge>
                    <ReadinessChip state={paymentProcessingReadiness.state} />
                  </div>
                ) : (
                  paymentProcessingReadiness && (
                    <div className="flex items-center gap-2">
                      <Link href="/settings/billing" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--tr-primary)] hover:bg-[var(--tr-surface-2)]">
                        Set up
                      </Link>
                      <ReadinessChip state={paymentProcessingReadiness.state} />
                    </div>
                  )
                )}
              </div>
            </Surface>
          </section>

          <section>
            <SectionTitle icon={<DownloadSimple size={17} weight="duotone" />} label="Export" tone="text-[var(--tr-violet)]" />
            <Surface className="divide-y divide-[var(--tr-border-soft)] overflow-hidden">
              <Link href="/api/export/csv" className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--tr-surface-2)]">
                <p className="text-sm text-[var(--tr-text)]">Download CSV</p>
                <DownloadSimple size={18} className="text-[var(--tr-text-muted)]" />
              </Link>
              <div className="space-y-3 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[var(--tr-text)]">Google Sheets sync</p>
                    <p className="text-sm text-[var(--tr-text-muted)]">
                      {settingsContractor?.google_sheets_last_synced_at
                        ? `Last synced ${new Date(settingsContractor.google_sheets_last_synced_at).toLocaleString()}`
                        : "Optional live spreadsheet export"}
                    </p>
                  </div>
                  <Badge variant={settingsContractor?.google_sheets_status === "connected" ? "success" : settingsContractor?.google_sheets_status === "error" ? "error" : "default"}>
                    {settingsContractor?.google_sheets_status ?? "disconnected"}
                  </Badge>
                </div>
                {googleMessage && <p className="text-sm text-[var(--tr-text-muted)]">{googleMessage}</p>}
                {settingsContractor?.google_sheets_sync_enabled && settingsContractor.google_sheets_sheet_id ? (
                  <div className="grid grid-cols-2 gap-2">
                    <form action="/api/google-sheets/sync" method="post">
                      <button type="submit" className="tr-primary-action w-full rounded-lg px-3 py-2 text-sm font-semibold">
                        Sync now
                      </button>
                    </form>
                    <form action="/api/google-sheets/disconnect" method="post">
                      <button type="submit" className="w-full rounded-lg bg-[var(--tr-surface-2)] px-3 py-2 text-sm font-semibold text-[var(--tr-text)] hover:bg-[var(--tr-surface-3)]">
                        Disconnect
                      </button>
                    </form>
                  </div>
                ) : (
                  <Link href="/api/google-sheets/connect" className="block w-full rounded-lg bg-[var(--tr-surface-2)] px-3 py-2 text-center text-sm font-semibold text-[var(--tr-text)] hover:bg-[var(--tr-surface-3)]">
                    Connect Google Sheets
                  </Link>
                )}
              </div>
            </Surface>
          </section>

          <form action={logout}>
            <Button type="submit" variant="secondary" className="w-full">
              Sign out
            </Button>
          </form>

          <DeleteAccount email={settingsContractor?.email ?? user.email ?? ""} />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, label, tone }: { icon: ReactNode; label: string; tone: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--tr-text-muted)]">
      <span className={tone}>{icon}</span>
      {label}
    </h2>
  );
}

function SettingRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm text-[var(--tr-text-muted)]">{label}</p>
      <p className={`text-sm text-[var(--tr-text)] ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}
