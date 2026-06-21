import type { QuoteTemplatePreset } from "@/types";

export type LaunchReadinessKey =
  | "business_identity"
  | "quote_document"
  | "delivery_channels"
  | "payments"
  | "first_quote";

export type LaunchReadinessItem = {
  key: LaunchReadinessKey;
  label: string;
  detail: string;
  impact: string;
  href: string;
  actionLabel: string;
  complete: boolean;
};

export type LaunchReadinessInput = {
  contractor: {
    business_name: string | null;
    business_phone: string | null;
    business_website: string | null;
    license_text: string | null;
    logo_url: string | null;
    quote_default_terms: string | null;
    quote_policy_text: string | null;
    quote_template_preset: QuoteTemplatePreset | null;
    stripe_connect_account_id: string | null;
  };
  delivery: {
    emailConfigured: boolean;
    smsConfigured: boolean;
  };
  quoteCount: number;
};

export type LaunchReadinessState = {
  items: LaunchReadinessItem[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  readyToSendFirstQuote: boolean;
};

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function buildLaunchReadiness(input: LaunchReadinessInput): LaunchReadinessState {
  const { contractor, delivery, quoteCount } = input;
  const hasBusinessName = hasValue(contractor.business_name);
  const hasBusinessPhone = hasValue(contractor.business_phone);
  const hasLicenseText = hasValue(contractor.license_text);
  const hasTemplate = Boolean(contractor.quote_template_preset);
  const hasLogo = hasValue(contractor.logo_url);
  const hasTerms = hasValue(contractor.quote_default_terms);
  const hasPolicy = hasValue(contractor.quote_policy_text);
  const hasPayment = hasValue(contractor.stripe_connect_account_id);
  const hasFirstQuote = quoteCount > 0;

  const items: LaunchReadinessItem[] = [
    {
      key: "business_identity",
      label: "Business identity",
      detail: hasBusinessName && hasBusinessPhone && hasLicenseText
        ? "Name, phone, and license text are ready."
        : "Add business phone and license or insured text.",
      impact: "Makes every quote look like it came from a real, reachable contractor.",
      href: "/settings",
      actionLabel: "Update profile",
      complete: hasBusinessName && hasBusinessPhone && hasLicenseText,
    },
    {
      key: "quote_document",
      label: "Quote document",
      detail: hasTemplate && hasLogo && hasTerms && hasPolicy
        ? "Logo, template, terms, and policy language are set."
        : "Add logo, default terms, and warranty or policy language.",
      impact: "Turns the first sent quote into a consistent client-facing document.",
      href: "/settings",
      actionLabel: "Set quote defaults",
      complete: hasTemplate && hasLogo && hasTerms && hasPolicy,
    },
    {
      key: "delivery_channels",
      label: "Delivery channels",
      detail: delivery.emailConfigured && delivery.smsConfigured
        ? "Email and SMS delivery are configured."
        : "Configure SendGrid and Twilio before public sale.",
      impact: "Lets Taskrel send quotes where clients already respond.",
      href: "/settings",
      actionLabel: "Review delivery",
      complete: delivery.emailConfigured && delivery.smsConfigured,
    },
    {
      key: "payments",
      label: "Client payments",
      detail: hasPayment
        ? "Stripe Connect is ready for invoice payments."
        : "Connect Stripe before relying on Taskrel for payment collection.",
      impact: "Keeps quote-to-invoice-to-payment in one workflow.",
      href: "/settings/billing",
      actionLabel: "Set up payments",
      complete: hasPayment,
    },
    {
      key: "first_quote",
      label: "First quote",
      detail: hasFirstQuote
        ? "At least one quote has been created."
        : "Create one real quote to validate the first-session workflow.",
      impact: "Proves the workspace can move from job notes to a client-ready quote.",
      href: "/quotes/new",
      actionLabel: "Create quote",
      complete: hasFirstQuote,
    },
  ];

  const completedCount = items.filter(item => item.complete).length;
  const totalCount = items.length;

  return {
    items,
    completedCount,
    totalCount,
    percentComplete: Math.round((completedCount / totalCount) * 100),
    readyToSendFirstQuote: completedCount === totalCount,
  };
}
