// ─── Trades ───────────────────────────────────────────────────────────────────

export type Trade =
  | "painting"
  | "roofing"
  | "flooring"
  | "landscaping"
  | "hvac"
  | "plumbing"
  | "electrical";

export const TRADE_LABELS: Record<Trade, string> = {
  painting: "Painting",
  roofing: "Roofing",
  flooring: "Flooring",
  landscaping: "Landscaping",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
};

export type BusinessType =
  | "home_improvement"
  | "mechanical_services"
  | "outdoor_services"
  | "general_contracting"
  | "other";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  home_improvement: "Home Improvement",
  mechanical_services: "Mechanical Services",
  outdoor_services: "Outdoor Services",
  general_contracting: "General Contracting",
  other: "Other Services",
};

export type QuoteTemplatePreset = "classic" | "modern" | "compact";

export interface BusinessSnapshot {
  business_name: string;
  email: string | null;
  logo_url: string | null;
  business_phone: string | null;
  business_website: string | null;
  license_text: string | null;
  quote_default_terms: string | null;
  quote_default_note: string | null;
}

// ─── Contractor ───────────────────────────────────────────────────────────────

export interface Contractor {
  id: string;
  user_id: string;
  business_name: string;
  business_type: BusinessType | null;
  trade: Trade | null;
  primary_trade: Trade | null;
  trades: Trade[];
  phone: string | null;
  email: string;
  logo_url: string | null;
  business_phone: string | null;
  business_website: string | null;
  license_text: string | null;
  quote_default_terms: string | null;
  quote_default_note: string | null;
  quote_template_preset: QuoteTemplatePreset;
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  subscription_status: "trialing" | "active" | "past_due" | "canceled" | null;
  google_sheets_sync_enabled: boolean;
  google_sheets_refresh_token: string | null;
  google_sheets_sheet_id: string | null;
  google_sheets_last_synced_at: string | null;
  google_sheets_status: "disconnected" | "connected" | "error";
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  contractor_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected" | "expired";

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total: number;
}

export interface Quote {
  id: string;
  contractor_id: string;
  client_id: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  trade: Trade;
  status: QuoteStatus;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  valid_until: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  business_snapshot: BusinessSnapshot | null;
  template_preset: QuoteTemplatePreset;
  sent_via: ("email" | "sms")[];
  created_at: string;
  updated_at: string;
}

// ─── Job ──────────────────────────────────────────────────────────────────────

export type JobStatus = "scheduled" | "in_progress" | "completed" | "canceled";

export interface Job {
  id: string;
  contractor_id: string;
  client_id: string | null;
  quote_id: string | null;
  title: string;
  description: string | null;
  status: JobStatus;
  scheduled_start: string;
  scheduled_end: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export interface Invoice {
  id: string;
  contractor_id: string;
  client_id: string | null;
  quote_id: string | null;
  job_id: string | null;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  status: InvoiceStatus;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  due_date: string | null;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_payment_link: string | null;
  notes: string | null;
  sent_via: ("email" | "sms")[];
  created_at: string;
  updated_at: string;
}
