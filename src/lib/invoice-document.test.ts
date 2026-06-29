import { describe, expect, it } from "vitest";
import { renderInvoiceDocumentHtml } from "./invoice-document";
import type { BusinessSnapshot } from "@/types";

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

type InvoiceInput = Parameters<typeof renderInvoiceDocumentHtml>[0]["invoice"];

const baseInvoice: InvoiceInput = {
  invoice_number: "INV-1042",
  status: "sent",
  client_name: "Acme Properties",
  client_email: "billing@acme.test",
  client_phone: "(305) 555-0199",
  line_items: [
    { description: "Interior repaint", quantity: 1, unit: "job", unit_price: 1850, total: 1850 },
  ],
  subtotal: 1850,
  tax_rate: 0,
  tax_amount: 0,
  total: 1850,
  amount_paid: 0,
  due_date: "2026-07-15T12:00:00.000Z",
  paid_at: null,
  stripe_payment_link: "https://pay.stripe.com/test_abc123",
  notes: "Net 30. Thank you for your business.",
  created_at: "2026-06-15T12:00:00.000Z",
};

function render(overrides: Partial<InvoiceInput> = {}) {
  return renderInvoiceDocumentHtml({ invoice: { ...baseInvoice, ...overrides }, business });
}

describe("renderInvoiceDocumentHtml", () => {
  it("renders an invoice fragment with the INVOICE label and number", () => {
    const html = render();
    expect(html).toContain("INVOICE");
    expect(html).toContain("INV-1042");
    // A fragment, not a full HTML document — the PDF shell wraps it.
    expect(html.toLowerCase()).not.toContain("<!doctype");
  });

  it("renders the bill-to block from client name / email / phone", () => {
    const html = render();
    expect(html).toContain("invoice-bill-to");
    expect(html).toContain("Acme Properties");
    expect(html).toContain("billing@acme.test");
    expect(html).toContain("(305) 555-0199");
  });

  it("renders line items as rows with the amount", () => {
    const html = render();
    expect(html).toContain("invoice-line-items");
    expect(html).toContain("invoice-line-row");
    expect(html).toContain("Interior repaint");
    expect(html).toContain("$1,850.00");
  });

  it("shows balance due equal to total when nothing is paid", () => {
    const html = render({ amount_paid: 0 });
    expect(html).toContain("Balance due");
    expect(html).toContain("$1,850.00");
    expect(html).not.toContain("invoice-status-paid");
  });

  it("shows the remaining balance after a partial payment", () => {
    const html = render({ amount_paid: 500 });
    expect(html).toContain("Amount paid");
    expect(html).toContain("$500.00");
    expect(html).toContain("$1,350.00"); // balance due
    expect(html).not.toContain("invoice-status-paid");
  });

  it("shows a PAID badge and $0.00 balance when fully paid", () => {
    const html = render({ amount_paid: 1850, status: "paid", paid_at: "2026-06-20T12:00:00.000Z" });
    expect(html).toContain("invoice-status-paid");
    expect(html).toContain("$0.00");
  });

  it("shows a PAID badge and clamps balance to $0.00 when overpaid", () => {
    const html = render({ amount_paid: 2000 });
    expect(html).toContain("invoice-status-paid");
    expect(html).toContain("$0.00");
    expect(html).not.toContain("-$"); // never a negative balance
  });

  it("shows an overdue indicator when status is overdue", () => {
    const html = render({ status: "overdue" });
    expect(html).toContain("invoice-status-overdue");
    expect(html).not.toContain("invoice-status-paid");
  });

  it("renders a Pay online link to the stripe payment link when present", () => {
    const html = render();
    expect(html).toContain("invoice-pay-link");
    expect(html).toContain("https://pay.stripe.com/test_abc123");
    expect(html).toContain("Pay online");
  });

  it("omits the payment CTA when no stripe payment link is set", () => {
    const html = render({ stripe_payment_link: null });
    expect(html).not.toContain("invoice-pay-link");
    expect(html).not.toContain("Pay online");
  });

  it("refuses to render a non-http(s) payment link (javascript: scheme)", () => {
    const html = render({ stripe_payment_link: "javascript:alert(document.cookie)" });
    expect(html).not.toContain("invoice-pay-link");
    expect(html).not.toContain("Pay online");
    expect(html).not.toContain("javascript:");
  });

  it("renders a normal https payment link", () => {
    const html = render({ stripe_payment_link: "https://pay.stripe.com/x" });
    expect(html).toContain("invoice-pay-link");
  });

  it("escapes client-supplied name, notes, and line-item descriptions", () => {
    const html = render({
      client_name: "<script>alert(1)</script>",
      notes: "5 < 6 & \"quoted\"",
      line_items: [{ description: "Trim & caulk <edge>", quantity: 1, unit: "job", unit_price: 100, total: 100 }],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Trim &amp; caulk &lt;edge&gt;");
    expect(html).toContain("5 &lt; 6 &amp;");
  });

  it("renders the due date when present and omits it when absent", () => {
    expect(render({ due_date: "2026-07-15T12:00:00.000Z" })).toContain("invoice-due-date");
    expect(render({ due_date: null })).not.toContain("invoice-due-date");
  });

  it("renders an empty line-item list without throwing", () => {
    const html = render({ line_items: [], subtotal: 0, total: 0, amount_paid: 0 });
    expect(html).toContain("invoice-line-items");
    expect(html).toContain("Balance due");
  });
});
