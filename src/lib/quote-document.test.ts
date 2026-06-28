import { describe, expect, it } from "vitest";
import { renderQuoteDocumentHtml } from "./quote-document";
import type { BusinessSnapshot, Quote, QuoteTemplatePreset } from "@/types";

const business: BusinessSnapshot = {
  business_name: "Taskrel Painting",
  email: "hello@taskrel.com",
  logo_url: null,
  business_phone: "(305) 555-0100",
  business_website: "taskrel.com",
  license_text: "Licensed and insured",
  quote_default_terms: "Quote valid for 30 days.",
  quote_default_note: "Thank you for the opportunity.",
  quote_policy_text: "One-year workmanship warranty.",
};

const quote = {
  client_name: "Acme Properties",
  client_address: "1200 Brickell Ave, Miami, FL",
  client_email: "billing@acme.test",
  client_phone: "(305) 555-0199",
  line_items: [
    {
      description:
        "Interior wall repaint for living room, hallway, and two bedrooms. Includes patching nail holes, sanding rough areas, two coats of premium acrylic paint, and cleanup.",
      quantity: 1,
      unit: "job",
      unit_price: 1850,
      total: 1850,
    },
  ],
  subtotal: 1850,
  tax_rate: 0,
  tax_amount: 0,
  total: 1850,
  notes: "Client wants low-VOC paint.",
  scheduled_start: null,
  scheduled_end: null,
  created_at: "2026-06-15T12:00:00.000Z",
} as Pick<
  Quote,
  | "client_name"
  | "client_address"
  | "client_email"
  | "client_phone"
  | "line_items"
  | "subtotal"
  | "tax_rate"
  | "tax_amount"
  | "total"
  | "notes"
  | "scheduled_start"
  | "scheduled_end"
  | "created_at"
>;

describe("renderQuoteDocumentHtml", () => {
  it.each<QuoteTemplatePreset>(["classic", "modern", "compact"])(
    "renders long line item copy as a scannable title and detail for %s",
    preset => {
      const html = renderQuoteDocumentHtml({ quote, business, preset });

      expect(html).toContain("quote-line-title");
      expect(html).toContain("quote-line-detail");
      expect(html).toContain("Interior wall repaint");
      expect(html).toContain("Includes patching nail holes");
    }
  );

  it("uses a subdued logo placeholder instead of a dominant dashed box", () => {
    const html = renderQuoteDocumentHtml({ quote, business, preset: "classic" });

    expect(html).toContain("Logo");
    expect(html).not.toContain("width:94px;height:54px");
  });

  it("keeps the compact template neutral instead of pastel-heavy", () => {
    const html = renderQuoteDocumentHtml({ quote, business, preset: "compact" });

    expect(html).not.toContain("#FFFAF5");
    expect(html).not.toContain("#FFEDD5");
  });

  it.each<QuoteTemplatePreset>(["classic", "modern", "compact"])(
    "renders pricing as mobile-friendly rows instead of a cramped table for %s",
    preset => {
      const html = renderQuoteDocumentHtml({ quote, business, preset });

      expect(html).toContain("quote-line-items");
      expect(html).toContain("quote-line-row");
      expect(html).not.toContain("<table");
    }
  );

  it.each<QuoteTemplatePreset>(["classic", "modern", "compact"])(
    "renders quote metadata in a stable summary section for %s",
    preset => {
      const html = renderQuoteDocumentHtml({ quote, business, preset });

      expect(html).toContain("quote-document-summary");
      expect(html).toContain("Prepared for");
      expect(html).toContain("Quote date");
      expect(html).toContain("Acme Properties");
      expect(html).toContain("Jun 15, 2026");
    }
  );

  it.each<QuoteTemplatePreset>(["classic", "modern", "compact"])(
    "keeps quantity, unit price, and amount in separate line item positions for %s",
    preset => {
      const html = renderQuoteDocumentHtml({ quote, business, preset });

      expect(html).toContain("quote-line-quantity");
      expect(html).toContain("quote-line-unit-price");
      expect(html).toContain("quote-line-amount");
      expect(html).toContain("Qty");
      // Redesign shows the rate inline as "$X / unit" rather than a stacked
      // "Unit price" label, keeping qty / rate / amount in separate positions.
      expect(html).toContain("/ unit");
    }
  );

  it.each<QuoteTemplatePreset>(["classic", "modern", "compact"])(
    "groups notes, terms, and policies into named document sections for %s",
    preset => {
      const html = renderQuoteDocumentHtml({ quote, business, preset });

      expect(html).toContain("quote-document-notes");
      expect(html).toContain("quote-document-terms");
      expect(html).toContain("quote-document-policies");
      expect(html).toContain("Client note");
      expect(html).toContain("Terms");
      expect(html).toContain("Policies &amp; warranty");
    }
  );

  it("does not render filler schedule copy when a quote is not scheduled", () => {
    const html = renderQuoteDocumentHtml({ quote, business, preset: "compact" });

    expect(html).not.toContain("Ready after approval");
  });
});
