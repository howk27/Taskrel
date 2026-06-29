import { TrustPage } from "@/components/public/trust-page";

export default function TermsPage() {
  return (
    <TrustPage
      eyebrow="Terms"
      title="Simple operating terms for using Taskrel."
      intro="Taskrel is software for contractor quoting, scheduling, invoicing, payment workflow, and recordkeeping. Contractors remain responsible for reviewing work scope, prices, taxes, and client communications before sending."
      sections={[
        {
          title: "Subscription",
          body: "Taskrel is offered as a $19/month subscription unless a complimentary access code or validation arrangement applies. Subscriptions can be canceled according to the billing flow available in the app.",
        },
        {
          title: "Contractor responsibility",
          body: "AI-assisted quote drafts and pricing intelligence are starting points. The contractor must review every line item, price, tax setting, policy, warranty, and client-facing document before sending.",
        },
        {
          title: "Payments and delivery",
          body: "Stripe, SendGrid, and connected integrations may have their own fees, delivery limits, terms, or account requirements. Taskrel helps coordinate the workflow but does not replace those provider agreements. SMS delivery is not active in this version.",
        },
        {
          title: "Your data and deletion",
          body: "You control the business and client records you enter. Taskrel stores those records and the quote and invoice PDFs it generates so you can resend and reference them. You can permanently delete your account and all stored data, including those PDFs, from Settings at any time; deletion is immediate and irreversible. You are responsible for having a lawful basis to store your clients' information in Taskrel and for handling their requests under applicable privacy law.",
        },
      ]}
    />
  );
}
