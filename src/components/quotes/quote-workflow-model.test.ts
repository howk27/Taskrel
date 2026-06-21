import { describe, expect, it } from "vitest";
import { getQuoteWorkflowState, getQuoteWorkflowSummary } from "./quote-workflow-model";

const baseQuote = {
  id: "q1",
  client_name: "Ava Homeowner",
  client_address: "12 Palm Ave",
  total: 1200,
  status: "draft" as const,
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-02T00:00:00.000Z",
  scheduled_start: null,
  sent_via: [] as ("email" | "sms")[],
  client_email: "ava@example.com",
  client_phone: null,
  line_items: [{ description: "Paint bedroom", quantity: 1, unit_price: 1200, total: 1200 }],
  notes: "Includes materials",
};

describe("quote workflow model", () => {
  it("maps draft quotes to needs-review with send readiness", () => {
    const state = getQuoteWorkflowState(baseQuote);

    expect(state.bucket).toBe("needs_review");
    expect(state.bucketLabel).toBe("Needs review");
    expect(state.nextAction).toBe("Review & send");
    expect(state.deliveryLabel).toBe("Ready for email");
    expect(state.readiness.filter(item => item.complete)).toHaveLength(5);
  });

  it("marks sent quotes as waiting on client with follow-up action", () => {
    const state = getQuoteWorkflowState({
      ...baseQuote,
      status: "sent",
      sent_via: ["email", "sms"],
    });

    expect(state.bucket).toBe("waiting");
    expect(state.nextAction).toBe("Follow up");
    expect(state.deliveryLabel).toBe("Email + SMS");
  });

  it("marks sent quotes as follow-up due when the due date has passed", () => {
    const state = getQuoteWorkflowState(
      {
        ...baseQuote,
        status: "sent",
        sent_via: ["email"],
        follow_up_due_at: "2026-06-03T00:00:00.000Z",
      },
      { now: new Date("2026-06-04T12:00:00.000Z") },
    );

    expect(state.bucket).toBe("waiting");
    expect(state.nextAction).toBe("Follow up now");
    expect(state.nextActionDetail).toBe("Follow up with the client today");
    expect(state.followUpTone).toBe("due");
    expect(state.followUpLabel).toBe("Follow-up due");
  });

  it("shows the scheduled follow-up date for sent quotes that are not due yet", () => {
    const state = getQuoteWorkflowState(
      {
        ...baseQuote,
        status: "sent",
        sent_via: ["email"],
        follow_up_due_at: "2026-06-07T00:00:00.000Z",
      },
      { now: new Date("2026-06-04T12:00:00.000Z") },
    );

    expect(state.nextAction).toBe("Follow up");
    expect(state.nextActionDetail).toBe("Follow up on Jun 7, 2026");
    expect(state.followUpTone).toBe("scheduled");
    expect(state.followUpLabel).toBe("Due Jun 7, 2026");
  });

  it("aggregates quote counts and totals by workflow bucket", () => {
    const summary = getQuoteWorkflowSummary([
      baseQuote,
      { ...baseQuote, id: "q2", status: "approved", total: 900 },
      { ...baseQuote, id: "q3", status: "expired", total: 300 },
    ]);

    expect(summary.map(item => [item.key, item.count, item.total])).toEqual([
      ["needs_review", 1, 1200],
      ["waiting", 0, 0],
      ["approved", 1, 900],
      ["closed", 1, 300],
    ]);
  });
});
