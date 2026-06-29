import { describe, expect, it } from "vitest";
import { buildLaunchReadiness } from "./launch-readiness";

describe("buildLaunchReadiness", () => {
  it("marks launch readiness incomplete when trust, delivery, payment, and first quote setup are missing", () => {
    const readiness = buildLaunchReadiness({
      contractor: {
        business_name: "Taskrel Painting",
        business_phone: null,
        business_website: null,
        license_text: null,
        logo_url: null,
        quote_default_terms: null,
        quote_policy_text: null,
        quote_template_preset: "classic",
        stripe_connect_account_id: null,
      },
      delivery: {
        emailConfigured: false,
        smsConfigured: false,
      },
      quoteCount: 0,
    });

    expect(readiness.completedCount).toBe(0);
    expect(readiness.totalCount).toBe(5);
    expect(readiness.percentComplete).toBe(0);
    expect(readiness.readyToSendFirstQuote).toBe(false);
    expect(readiness.items.map(item => [item.key, item.complete])).toEqual([
      ["business_identity", false],
      ["quote_document", false],
      ["delivery_channels", false],
      ["payments", false],
      ["first_quote", false],
    ]);
  });

  it("marks launch readiness complete when the workspace can sell and send its first quote", () => {
    const readiness = buildLaunchReadiness({
      contractor: {
        business_name: "Taskrel Painting",
        business_phone: "(305) 555-0100",
        business_website: "https://taskrel.com",
        license_text: "Licensed and insured in Florida",
        logo_url: "https://example.com/logo.png",
        quote_default_terms: "Quote valid for 30 days.",
        quote_policy_text: "One-year workmanship warranty.",
        quote_template_preset: "modern",
        stripe_connect_account_id: "acct_123",
      },
      delivery: {
        emailConfigured: true,
        smsConfigured: true,
      },
      quoteCount: 1,
    });

    expect(readiness.completedCount).toBe(5);
    expect(readiness.percentComplete).toBe(100);
    expect(readiness.readyToSendFirstQuote).toBe(true);
    expect(readiness.items.every(item => item.complete)).toBe(true);
  });

  it("completes delivery readiness on email alone while SMS is pre-launch (v1)", () => {
    const readiness = buildLaunchReadiness({
      contractor: {
        business_name: "Taskrel Painting",
        business_phone: "(305) 555-0100",
        business_website: "https://taskrel.com",
        license_text: "Licensed and insured in Florida",
        logo_url: "https://example.com/logo.png",
        quote_default_terms: "Quote valid for 30 days.",
        quote_policy_text: "One-year workmanship warranty.",
        quote_template_preset: "modern",
        stripe_connect_account_id: "acct_123",
      },
      delivery: {
        emailConfigured: true,
        smsConfigured: false,
      },
      quoteCount: 1,
    });

    const delivery = readiness.items.find(item => item.key === "delivery_channels");
    expect(delivery?.complete).toBe(true);
    expect(readiness.readyToSendFirstQuote).toBe(true);
  });
});
