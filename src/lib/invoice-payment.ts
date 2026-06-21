import type Stripe from "stripe";

export function buildInvoicePaymentLinkParams({
  invoiceId,
  priceId,
}: {
  invoiceId: string;
  priceId: string;
}): Stripe.PaymentLinkCreateParams {
  const metadata = { invoice_id: invoiceId };

  return {
    line_items: [{ price: priceId, quantity: 1 }],
    payment_intent_data: {
      metadata,
    },
    metadata,
  };
}
