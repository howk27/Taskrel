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
          title: "Service providers",
          body: "Taskrel uses trusted providers for core operations, including Supabase for auth and database, Stripe for billing and payments, SendGrid for email delivery, Twilio for SMS delivery, OpenAI for quote assistance, and Google APIs when Sheets sync is connected.",
        },
        {
          title: "Data control",
          body: "Contractors can update business profile settings, export records, disconnect optional integrations, and request account support by emailing support@taskrel.com.",
        },
      ]}
    />
  );
}
