import type { BusinessType, InvoiceStatus, QuoteTemplatePreset, Trade } from "@/types";

export type ReadinessState = "complete" | "needs_attention" | "optional" | "error" | "pending";

export type ReadinessItem = {
  key: string;
  label: string;
  state: ReadinessState;
  detail: string;
  actionLabel?: string;
  href?: string;
};

export type BusinessReadinessInput = {
  business_name?: string | null;
  business_type?: BusinessType | string | null;
  trades?: (Trade | string)[] | null;
  primary_trade?: Trade | string | null;
};

export type OverheadReadinessInput = {
  enabled: boolean;
  overhead_percent: number | string | null;
  overhead_fixed_per_job: number | string | null;
  migrationMissing?: boolean;
};

export type QuoteDocumentReadinessInput = {
  quote_template_preset?: QuoteTemplatePreset | null;
  logo_url?: string | null;
  business_phone?: string | null;
  business_website?: string | null;
  license_text?: string | null;
  quote_default_terms?: string | null;
  quote_default_note?: string | null;
  quote_policy_text?: string | null;
  uploading?: boolean;
  uploadError?: string | null;
};

export type BillingReadinessInput = {
  subscription_status?: "trialing" | "active" | "past_due" | "canceled" | string | null;
  stripe_connect_account_id?: string | null;
  connectReturnState?: "success" | "refresh" | "error" | null;
  billingConfigured: boolean;
  connectConfigured: boolean;
};

export type QuoteFormReadinessInput = {
  client_name: string;
  client_email: string;
  client_phone: string;
  job_description: string;
  quote_date?: string | null;
  scheduled_start?: string | null;
};

export type InvoicePaymentReadinessInput = {
  client_email: string | null;
  client_phone: string | null;
  total: number | string | null;
  stripe_connect_account_id: string | null;
  stripe_payment_link: string | null;
  status: InvoiceStatus;
  amount_paid: number | string | null;
  paid_at: string | null;
  sendgridConfigured: boolean;
  twilioConfigured: boolean;
};

export type WebhookReadinessInput = {
  webhookConfigured: boolean;
  pending: boolean;
  error?: string | null;
};

export type EmptyStateKind =
  | "quotes"
  | "quote_results"
  | "invoices"
  | "jobs"
  | "calendar_day"
  | "clients"
  | "exports"
  | "settings_section";

function present(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function todayDateInput(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getBusinessReadiness(input: BusinessReadinessInput): ReadinessItem {
  if (!present(input.business_name)) {
    return { key: "business", label: "Business information", state: "needs_attention", detail: "Add business name.", actionLabel: "Edit business" };
  }
  if (!present(input.business_type)) {
    return { key: "business", label: "Business information", state: "needs_attention", detail: "Add business type.", actionLabel: "Edit business" };
  }
  if (!input.trades?.length) {
    return { key: "business", label: "Business information", state: "needs_attention", detail: "Choose at least one trade.", actionLabel: "Edit trades" };
  }
  if (!present(input.primary_trade)) {
    return { key: "business", label: "Business information", state: "needs_attention", detail: "Choose a primary trade.", actionLabel: "Edit trades" };
  }
  return { key: "business", label: "Business information", state: "complete", detail: "Business identity and trade profile are ready." };
}

export function getOverheadReadiness(input: OverheadReadinessInput): ReadinessItem {
  if (!input.enabled) {
    return { key: "overhead", label: "Internal pricing", state: "optional", detail: "No overhead is added to pricing recommendations." };
  }
  if (input.migrationMissing) {
    return { key: "overhead", label: "Internal pricing", state: "error", detail: "Run the latest Supabase migration to save overhead costs." };
  }
  const percent = num(input.overhead_percent);
  const fixed = num(input.overhead_fixed_per_job);
  if (!Number.isFinite(percent) || !Number.isFinite(fixed)) {
    return { key: "overhead", label: "Internal pricing", state: "needs_attention", detail: "Overhead values must be numbers." };
  }
  if (percent < 0 || fixed < 0) {
    return { key: "overhead", label: "Internal pricing", state: "needs_attention", detail: "Overhead values must be zero or more." };
  }
  if (percent > 100) {
    return { key: "overhead", label: "Internal pricing", state: "needs_attention", detail: "Overhead percent must be between 0 and 100." };
  }
  if (!input.enabled || (percent === 0 && fixed === 0)) {
    return { key: "overhead", label: "Internal pricing", state: "optional", detail: "No overhead is added to pricing recommendations." };
  }
  return { key: "overhead", label: "Internal pricing", state: "complete", detail: "Internal overhead is included in pricing recommendations." };
}

export function getQuoteDocumentReadiness(input: QuoteDocumentReadinessInput): ReadinessItem {
  if (input.uploadError) {
    return { key: "quote_documents", label: "Quote documents", state: "error", detail: input.uploadError };
  }
  if (input.uploading) {
    return { key: "quote_documents", label: "Quote documents", state: "pending", detail: "Logo upload is still in progress." };
  }
  if (!input.quote_template_preset) {
    return { key: "quote_documents", label: "Quote documents", state: "needs_attention", detail: "Choose a quote template." };
  }
  const hasClientFacingDefault = [
    input.logo_url,
    input.business_phone,
    input.business_website,
    input.license_text,
    input.quote_default_terms,
    input.quote_default_note,
    input.quote_policy_text,
  ].some(present);
  return hasClientFacingDefault
    ? { key: "quote_documents", label: "Quote documents", state: "complete", detail: "Client-facing quote defaults are ready." }
    : { key: "quote_documents", label: "Quote documents", state: "optional", detail: "Template is ready; logo, terms, and defaults can be added later." };
}

export function getBillingReadiness(input: BillingReadinessInput): ReadinessItem[] {
  const subscription: ReadinessItem = !input.billingConfigured
    ? { key: "subscription", label: "Taskrel subscription", state: "error", detail: "Stripe subscription billing is not configured." }
    : input.subscription_status === "active" || input.subscription_status === "trialing"
      ? { key: "subscription", label: "Taskrel subscription", state: "complete", detail: `Subscription is ${input.subscription_status}.` }
      : input.subscription_status === "past_due" || input.subscription_status === "canceled"
        ? { key: "subscription", label: "Taskrel subscription", state: "needs_attention", detail: `Subscription is ${input.subscription_status}.`, actionLabel: "Fix billing", href: "/settings/billing" }
        : { key: "subscription", label: "Taskrel subscription", state: "needs_attention", detail: "Subscription is not started.", actionLabel: "Subscribe", href: "/settings/billing" };

  const paymentProcessing: ReadinessItem = !input.connectConfigured
    ? { key: "payment_processing", label: "Payment processing", state: "needs_attention", detail: "Stripe Connect is not configured." }
    : input.connectReturnState === "refresh"
      ? { key: "payment_processing", label: "Payment processing", state: "needs_attention", detail: "Continue Stripe Connect setup.", actionLabel: "Continue setup", href: "/settings/billing" }
      : input.stripe_connect_account_id
        ? { key: "payment_processing", label: "Payment processing", state: "complete", detail: "Stripe Connect is ready for invoice payments." }
        : { key: "payment_processing", label: "Payment processing", state: "needs_attention", detail: "Set up Stripe Connect to collect invoice payments.", actionLabel: "Set up payments", href: "/settings/billing" };

  return [subscription, paymentProcessing];
}

export function getQuoteFormReadiness(input: QuoteFormReadinessInput): ReadinessItem[] {
  const hasClient = present(input.client_name);
  const hasChannel = present(input.client_email) || present(input.client_phone);
  const scopeLength = input.job_description.replace(/\s/g, "").length;
  const quoteDate = present(input.quote_date) ? input.quote_date?.trim() : todayDateInput();
  return [
    hasClient
      ? { key: "client", label: "Client", state: "complete", detail: "Client name is ready." }
      : { key: "client", label: "Client", state: "needs_attention", detail: "Add client name." },
    hasChannel
      ? { key: "send_channel", label: "Send channel", state: "complete", detail: "Email or phone is ready for sending." }
      : { key: "send_channel", label: "Send channel", state: "needs_attention", detail: "Add email or phone before sending." },
    scopeLength >= 20
      ? { key: "scope", label: "Scope", state: "complete", detail: "Job description is detailed enough to generate." }
      : { key: "scope", label: "Scope", state: "needs_attention", detail: "Describe the job with at least 20 characters." },
    quoteDate
      ? { key: "quote_date", label: "Quote date", state: "complete", detail: "Quote date is set." }
      : { key: "quote_date", label: "Quote date", state: "needs_attention", detail: "Choose a quote date." },
    present(input.scheduled_start)
      ? { key: "schedule", label: "Work date", state: "complete", detail: "Scheduled work date is set." }
      : { key: "schedule", label: "Work date", state: "optional", detail: "Schedule can be added later." },
  ];
}

export function getInvoicePaymentReadiness(input: InvoicePaymentReadinessInput): ReadinessItem[] {
  const total = num(input.total);
  const paid = num(input.amount_paid);
  return [
    input.client_email
      ? input.sendgridConfigured
        ? { key: "email", label: "Email", state: "complete", detail: "Email send is ready." }
        : { key: "email", label: "Email", state: "error", detail: "Email provider is not configured." }
      : { key: "email", label: "Email", state: "needs_attention", detail: "Add client email before email send." },
    input.client_phone
      ? input.twilioConfigured
        ? { key: "sms", label: "SMS", state: "complete", detail: "SMS send is ready." }
        : { key: "sms", label: "SMS", state: "error", detail: "SMS provider is not configured." }
      : { key: "sms", label: "SMS", state: "optional", detail: "Add client phone to send SMS." },
    total > 0
      ? { key: "total", label: "Invoice total", state: "complete", detail: "Invoice total is ready." }
      : { key: "total", label: "Invoice total", state: "needs_attention", detail: "Invoice total must be greater than zero." },
    input.stripe_payment_link
      ? { key: "payment_link", label: "Payment link", state: "complete", detail: "Online payment link is ready." }
      : input.stripe_connect_account_id
        ? { key: "payment_link", label: "Payment link", state: "pending", detail: "Payment link will be created when invoice is sent." }
        : { key: "payment_link", label: "Payment link", state: "needs_attention", detail: "Set up Stripe Connect to include online payment." },
    input.status === "paid" && paid >= total && input.paid_at
      ? { key: "webhook_payment", label: "Payment status", state: "complete", detail: "Payment recorded by Stripe." }
      : input.stripe_payment_link
        ? { key: "webhook_payment", label: "Payment status", state: "pending", detail: "Waiting for Stripe payment confirmation." }
        : { key: "webhook_payment", label: "Payment status", state: "optional", detail: "No online payment link has been sent." },
  ];
}

export function getWebhookReadiness(input: WebhookReadinessInput): ReadinessItem {
  if (!input.webhookConfigured) {
    return { key: "webhook", label: "Stripe updates", state: "error", detail: "Stripe updates are not configured." };
  }
  if (input.error) {
    return { key: "webhook", label: "Stripe updates", state: "error", detail: input.error };
  }
  if (input.pending) {
    return { key: "webhook", label: "Stripe updates", state: "pending", detail: "Waiting for Stripe confirmation." };
  }
  return { key: "webhook", label: "Stripe updates", state: "complete", detail: "Stripe updates are configured." };
}

export function emptyStateFor(kind: EmptyStateKind) {
  const map: Record<EmptyStateKind, { title: string; body: string; actionLabel?: string; href?: string }> = {
    quotes: { title: "No quotes yet", body: "Create the first quote to start a client workflow.", actionLabel: "Create quote", href: "/quotes/new" },
    quote_results: { title: "No matching quotes", body: "No quotes match this search or work bucket.", actionLabel: "Clear filters" },
    invoices: { title: "No invoices yet", body: "Invoices are created from approved quotes.", actionLabel: "Review quotes", href: "/quotes" },
    jobs: { title: "No active jobs yet", body: "Approved quotes with scheduled dates become jobs.", actionLabel: "Open quotes", href: "/quotes" },
    calendar_day: { title: "No work scheduled", body: "Scheduled jobs will appear on this day after quote approval." },
    clients: { title: "No clients yet", body: "Clients are created from sent quotes and invoices.", actionLabel: "Create quote", href: "/quotes/new" },
    exports: { title: "No live export connected", body: "CSV export is available now. Google Sheets sync is optional.", actionLabel: "Connect Google Sheets", href: "/api/google-sheets/connect" },
    settings_section: { title: "Nothing configured yet", body: "Add the fields that matter for this workflow. Optional fields can stay blank." },
  };
  return map[kind];
}
