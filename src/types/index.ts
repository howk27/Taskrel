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
export type PricingSource = "ai_estimate" | "catalog_match" | "manual_edit" | "mixed";

export interface PropertyValuationSnapshot {
  address: string;
  normalized_address: string | null;
  estimated_value: number | null;
  value_low: number | null;
  value_high: number | null;
  confidence: string | null;
  source: "manual" | "rentcast";
  fetched_at: string | null;
}

export interface PricingRecommendationSnapshot {
  subtotal: number;
  fixed_overhead_cost: number;
  percent_overhead_cost: number;
  total_overhead_cost: number;
  property_value: number | null;
  property_value_adjustment_percent: number;
  property_value_adjustment_amount: number;
  property_value_adjustment_label: string;
  property_value_adjustment_reason: string;
  recommended_subtotal: number;
}

export interface BusinessSnapshot {
  business_name: string;
  email: string | null;
  logo_url: string | null;
  business_phone: string | null;
  business_website: string | null;
  license_text: string | null;
  quote_default_terms: string | null;
  quote_default_note: string | null;
  quote_policy_text: string | null;
  /**
   * Quote-document renderer version frozen at send time. Lets already-sent
   * quotes keep rendering exactly as the client first saw them when the live
   * design later changes. Absent on unsent quotes (they render the current
   * design). See QUOTE_RENDERER_VERSION in lib/quote-document.ts.
   */
  renderer_version?: string | null;
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
  quote_policy_text: string | null;
  quote_template_preset: QuoteTemplatePreset;
  overhead_percent: number;
  overhead_fixed_per_job: number;
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
  catalog_item_id?: string;
  pricing_source?: PricingSource;
  edited_by_contractor?: boolean;
}

export interface QuoteAssistantMetadata {
  suggested_addons?: { label: string; price: number; reason: string }[];
  assistant_notes?: string[];
  assumptions?: string[];
  risk_flags?: string[];
  terms_suggestion?: string;
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
  pricing_source?: PricingSource;
  pricing_confidence?: string | null;
  property_valuation_snapshot: PropertyValuationSnapshot | null;
  pricing_recommendation_snapshot: PricingRecommendationSnapshot | null;
  notes: string | null;
  valid_until: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  business_snapshot: BusinessSnapshot | null;
  template_preset: QuoteTemplatePreset;
  public_access_token: string | null;
  approved_at: string | null;
  follow_up_due_at: string | null;
  last_followed_up_at: string | null;
  sent_via: ("email" | "sms")[];
  delivery_events?: DeliveryEvent[];
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
  delivery_events?: DeliveryEvent[];
  created_at: string;
  updated_at: string;
}

// â”€â”€â”€ Delivery Events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── Document archive ───────────────────────────────────────────────────────

export interface Document {
  id: string;
  contractor_id: string;
  entity_type: "quote" | "invoice";
  entity_id: string;
  storage_path: string;
  file_name: string;
  renderer_version: string | null;
  byte_size: number | null;
  created_at: string;
}

export type DeliveryEntityType = "quote" | "invoice";
export type DeliveryAction = "send" | "payment_link" | "payment";
export type DeliveryChannel = "email" | "sms" | "stripe";
export type DeliveryProvider = "sendgrid" | "twilio" | "stripe" | "taskrel";
export type DeliveryStatus = "success" | "error" | "info";

export interface DeliveryEvent {
  id: string;
  contractor_id: string;
  actor_user_id: string | null;
  entity_type: DeliveryEntityType;
  entity_id: string;
  action: DeliveryAction;
  channel: DeliveryChannel;
  provider: DeliveryProvider;
  recipient: string | null;
  status: DeliveryStatus;
  code: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
