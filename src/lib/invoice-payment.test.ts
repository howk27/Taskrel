import { describe, expect, it } from "vitest";
import { buildInvoicePaymentLinkParams } from "./invoice-payment";

describe("buildInvoicePaymentLinkParams", () => {
  it("carries invoice metadata onto the PaymentIntent", () => {
    const params = buildInvoicePaymentLinkParams({
      invoiceId: "inv_123",
      priceId: "price_123",
    });

    expect(params).toEqual({
      line_items: [{ price: "price_123", quantity: 1 }],
      payment_intent_data: {
        metadata: {
          invoice_id: "inv_123",
        },
      },
      metadata: {
        invoice_id: "inv_123",
      },
    });
  });
});
