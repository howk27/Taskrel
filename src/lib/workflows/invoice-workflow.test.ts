import { describe, expect, it } from "vitest";
import { getInvoiceWorkflowState, getInvoiceWorkflowSummary } from "./invoice-workflow";

const now = new Date("2026-06-17T14:00:00.000Z");

const baseInvoice = {
  id: "inv-1",
  invoice_number: "INV-0001",
  client_name: "Ava Homeowner",
  client_email: "ava@example.com",
  client_phone: null,
  status: "sent" as const,
  total: 1200,
  amount_paid: 0,
  due_date: "2026-06-16",
  paid_at: null,
  stripe_payment_link: "https://pay.stripe.test/inv-1",
  sent_via: ["email"] as ("email" | "sms")[],
  created_at: "2026-06-10T00:00:00.000Z",
  updated_at: "2026-06-10T00:00:00.000Z",
};

describe("invoice workflow model", () => {
  it("derives overdue collection work from due date and unpaid balance", () => {
    const state = getInvoiceWorkflowState(baseInvoice, { now });

    expect(state.effectiveStatus).toBe("overdue");
    expect(state.bucket).toBe("collect");
    expect(state.nextAction).toBe("Follow up on payment");
    expect(state.balanceDue).toBe(1200);
    expect(state.proof.map(item => item.label)).toEqual([
      "Sent by email",
      "Payment link ready",
      "Due Jun 16, 2026",
    ]);
  });

  it("keeps draft invoices from being sent until contact and line proof exist", () => {
    const state = getInvoiceWorkflowState({
      ...baseInvoice,
      status: "draft",
      client_email: null,
      client_phone: null,
      stripe_payment_link: null,
      sent_via: [],
      due_date: null,
    }, { now });

    expect(state.effectiveStatus).toBe("draft");
    expect(state.bucket).toBe("prepare");
    expect(state.nextAction).toBe("Add client contact");
    expect(state.blockers).toContainEqual({
      key: "contact",
      label: "Client contact",
      detail: "Add email or phone before sending",
    });
  });

  it("uses payment evidence to close paid invoices", () => {
    const state = getInvoiceWorkflowState({
      ...baseInvoice,
      status: "sent",
      amount_paid: 1200,
      paid_at: "2026-06-17T13:45:00.000Z",
    }, { now });

    expect(state.effectiveStatus).toBe("paid");
    expect(state.bucket).toBe("closed");
    expect(state.nextAction).toBe("View payment proof");
    expect(state.balanceDue).toBe(0);
    expect(state.proof.some(item => item.label === "Paid Jun 17, 2026")).toBe(true);
  });

  it("summarizes invoices by workflow bucket and balance", () => {
    const summary = getInvoiceWorkflowSummary([
      { ...baseInvoice, id: "draft", status: "draft", amount_paid: 0, due_date: null, sent_via: [] },
      baseInvoice,
      { ...baseInvoice, id: "paid", status: "paid", amount_paid: 1200, paid_at: "2026-06-17T13:45:00.000Z" },
    ], { now });

    expect(summary.map(item => [item.key, item.count, item.total])).toEqual([
      ["prepare", 1, 1200],
      ["collect", 1, 1200],
      ["closed", 1, 0],
    ]);
  });
});
