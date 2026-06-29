import { TrustPage } from "@/components/public/trust-page";

export default function PrivacyPage() {
  return (
    <TrustPage
      eyebrow="Privacy"
      title="Taskrel keeps contractor records focused on the work."
      intro="Taskrel stores the information needed to create, send, invoice, collect, and export contractor job records. This page is a plain-language launch privacy summary."
      sections={[
        {
          title: "Information Taskrel uses",
          body: "Taskrel stores account details, business profile settings, client contact details, quote and invoice records, job schedules, payment setup status, and export connection settings.",
        },
        {
          title: "Stored documents",
          body: "When a quote or invoice is sent, Taskrel saves a PDF copy as a frozen record of exactly what the client received. These PDFs contain client personal information — name, address, contact details, and line items — and are kept in a private, access-controlled store scoped to your account. Only your authenticated account can retrieve them, through short-lived signed links.",
        },
        {
          title: "Service providers",
          body: "Taskrel uses trusted providers for core operations, including Supabase for auth, database, and document storage, Stripe for billing and payments, SendGrid for email delivery, OpenAI for quote assistance, and Google APIs when Sheets sync is connected. SMS delivery (Twilio) is not active in this version; if it is enabled later, this page and your consent settings will be updated first.",
        },
        {
          title: "Deleting your data",
          body: "You can permanently delete your account at any time from Settings. Deletion removes your contractor profile, every client, quote, invoice, job, and pricing record, and every stored quote and invoice PDF — including the client personal information they contain. This is immediate and cannot be undone. Billing records held by our payment processor (Stripe) follow their own retention rules. You can also email support@taskrel.com for help with a deletion request.",
        },
        {
          title: "Data control",
          body: "Contractors can update business profile settings, export records, disconnect optional integrations, delete their account and stored documents, and request support by emailing support@taskrel.com.",
        },
      ]}
    />
  );
}
