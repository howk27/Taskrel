import { describe, expect, it } from "vitest";
import {
  emptyStateFor,
  getBillingReadiness,
  getBusinessReadiness,
  getInvoicePaymentReadiness,
  getOverheadReadiness,
  getQuoteDocumentReadiness,
  getQuoteFormReadiness,
  getWebhookReadiness,
  todayDateInput,
} from "./setup-readiness";

describe("setup readiness", () => {
  it("marks required business information complete when identity and services exist", () => {
    expect(
      getBusinessReadiness({
        business_name: "APR Painting",
        trades: ["painting"],
      }).state
    ).toBe("complete");

    expect(
      getBusinessReadiness({
        business_name: "APR Painting",
        trades: [],
      })
    ).toMatchObject({
      state: "needs_attention",
      detail: "Choose at least one service.",
    });
  });

  it("treats overhead as optional when intentionally off and complete when values are enabled", () => {
    expect(
      getOverheadReadiness({
        enabled: false,
        overhead_percent: 0,
        overhead_fixed_per_job: 0,
      }).state
    ).toBe("optional");
    expect(
      getOverheadReadiness({
        enabled: true,
        overhead_percent: 10,
        overhead_fixed_per_job: 250,
      }).state
    ).toBe("complete");
    expect(
      getOverheadReadiness({
        enabled: true,
        overhead_percent: 150,
        overhead_fixed_per_job: 0,
      })
    ).toMatchObject({
      state: "needs_attention",
      detail: "Overhead percent must be between 0 and 100.",
    });
  });

  it("keeps disabled overhead optional even when stale values are invalid", () => {
    expect(
      getOverheadReadiness({
        enabled: false,
        overhead_percent: "not-a-number",
        overhead_fixed_per_job: 250,
      })
    ).toMatchObject({
      state: "optional",
      detail: "No overhead is added to pricing recommendations.",
    });
  });

  it("keeps quote documents optional when only a template exists and complete when client-facing defaults exist", () => {
    expect(getQuoteDocumentReadiness({ quote_template_preset: "classic" }).state).toBe("optional");
    expect(
      getQuoteDocumentReadiness({
        quote_template_preset: "classic",
        logo_url: "https://example.com/logo.png",
      }).state
    ).toBe("complete");
  });

  it("treats missing Stripe Connect as recoverable payment setup", () => {
    expect(
      getBillingReadiness({
        subscription_status: "active",
        stripe_connect_account_id: null,
        connectReturnState: null,
        billingConfigured: true,
        connectConfigured: false,
      }).map(item => [item.key, item.state])
    ).toEqual([
      ["subscription", "complete"],
      ["payment_processing", "needs_attention"],
    ]);
  });

  it("marks quote form date complete by default and scheduled work optional", () => {
    const items = getQuoteFormReadiness({
      client_name: "Maria",
      client_email: "",
      client_phone: "",
      job_description: "Paint two bedrooms and repair drywall.",
      quote_date: "",
      scheduled_start: null,
    });

    expect(items.find(item => item.key === "quote_date")?.state).toBe("complete");
    expect(items.find(item => item.key === "schedule")?.state).toBe("optional");
    expect(items.find(item => item.key === "send_channel")?.state).toBe("needs_attention");
  });

  it("derives the default quote date from local calendar fields", () => {
    const date = {
      getFullYear: () => 2026,
      getMonth: () => 5,
      getDate: () => 22,
      toISOString: () => "2026-06-23T00:00:00.000Z",
    } as Date;

    expect(todayDateInput(date)).toBe("2026-06-22");
  });

  it("treats a missing quote date as complete for readiness", () => {
    const items = getQuoteFormReadiness({
      client_name: "Maria",
      client_email: "client@example.com",
      client_phone: "",
      job_description: "Paint two bedrooms and repair drywall.",
      scheduled_start: null,
    });

    expect(items.find(item => item.key === "quote_date")?.state).toBe("complete");
  });

  it("represents invoice payment links and webhook-paid states separately", () => {
    expect(
      getInvoicePaymentReadiness({
        client_email: "client@example.com",
        client_phone: null,
        total: 1200,
        stripe_connect_account_id: null,
        stripe_payment_link: null,
        status: "sent",
        amount_paid: 0,
        paid_at: null,
        sendgridConfigured: true,
        twilioConfigured: false,
      }).find(item => item.key === "payment_link")
    ).toMatchObject({
      state: "needs_attention",
      detail: "Set up Stripe Connect to include online payment.",
    });

    expect(
      getInvoicePaymentReadiness({
        client_email: "client@example.com",
        client_phone: null,
        total: 1200,
        stripe_connect_account_id: "acct_123",
        stripe_payment_link: "https://pay.stripe.com/test",
        status: "paid",
        amount_paid: 1200,
        paid_at: "2026-06-21T12:00:00.000Z",
        sendgridConfigured: true,
        twilioConfigured: false,
      }).find(item => item.key === "webhook_payment")
    ).toMatchObject({
      state: "complete",
      detail: "Payment recorded by Stripe.",
    });
  });

  it("represents webhook configuration and pending confirmation states", () => {
    expect(getWebhookReadiness({ webhookConfigured: false, pending: false }).state).toBe("error");
    expect(getWebhookReadiness({ webhookConfigured: true, pending: true }).state).toBe("pending");
    expect(getWebhookReadiness({ webhookConfigured: true, pending: false }).state).toBe("complete");
  });

  it("returns actionable empty-state copy", () => {
    expect(emptyStateFor("quotes")).toEqual({
      title: "No quotes yet",
      body: "Create the first quote to start a client workflow.",
      actionLabel: "Create quote",
      href: "/quotes/new",
    });
  });
});
