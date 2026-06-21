import { TrustPage } from "@/components/public/trust-page";

export default function SupportPage() {
  return (
    <TrustPage
      eyebrow="Support"
      title="Help for contractors using Taskrel in the field."
      intro="Taskrel support is focused on practical workflow help: quote setup, delivery, billing, payments, exports, and account access."
      sections={[
        {
          title: "Contact",
          body: "Email support@taskrel.com for product support, billing questions, setup help, and account issues. Include your business name and the quote or invoice number when the question is about a specific record.",
        },
        {
          title: "Response expectations",
          body: "Most support requests are handled during normal business hours. Urgent billing or account-access issues should include 'Urgent' in the subject line so they can be triaged first.",
        },
        {
          title: "Setup help",
          body: "For a clean launch workflow, complete your business identity, quote defaults, delivery channels, and Stripe Connect setup before sending your first client quote.",
        },
      ]}
    />
  );
}
