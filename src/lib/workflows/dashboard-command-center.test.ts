import { describe, expect, it } from "vitest";
import { buildAttentionList, buildDashboardCommandCenter } from "./dashboard-command-center";

const now = new Date("2026-06-17T14:00:00.000Z");

const sampleInput = {
  now,
  quotes: [
    {
      id: "quote-1",
      client_name: "Ava Homeowner",
      client_address: "12 Palm Ave",
      client_email: "ava@example.com",
      client_phone: null,
      total: 2400,
      status: "sent",
      created_at: "2026-06-10T00:00:00.000Z",
      updated_at: "2026-06-10T00:00:00.000Z",
      scheduled_start: null,
      sent_via: ["email"],
      line_items: [{ description: "Paint", quantity: 1, unit_price: 2400, total: 2400 }],
      notes: "Follow up",
    },
  ],
  invoices: [
    {
      id: "inv-1",
      invoice_number: "INV-0001",
      client_name: "Ben Client",
      client_email: "ben@example.com",
      client_phone: null,
      status: "sent",
      total: 900,
      amount_paid: 0,
      due_date: "2026-06-16",
      paid_at: null,
      stripe_payment_link: "https://pay.stripe.test/inv-1",
      sent_via: ["email"],
      created_at: "2026-06-10T00:00:00.000Z",
      updated_at: "2026-06-10T00:00:00.000Z",
    },
  ],
  jobs: [
    {
      id: "job-1",
      title: "Install trim",
      status: "scheduled",
      scheduled_start: "2026-06-17T15:00:00.000Z",
      scheduled_end: "2026-06-17T18:00:00.000Z",
      address: "22 Cedar St",
      quote_id: "quote-2",
      created_at: "2026-06-10T00:00:00.000Z",
      updated_at: "2026-06-10T00:00:00.000Z",
    },
  ],
} satisfies Parameters<typeof buildDashboardCommandCenter>[0];

describe("dashboard attention list", () => {
  it("merges every lane into one severity-ranked stream tagged by lane", () => {
    const list = buildAttentionList(buildDashboardCommandCenter(sampleInput));

    // Invoice is overdue (danger) > quote follow-up (warning) > today job (info).
    expect(list.map(item => item.laneKey)).toEqual(["moneyToCollect", "quoteFollowUp", "today"]);
    expect(list[0]).toMatchObject({ laneKey: "moneyToCollect", laneLabel: "Invoice", tone: "danger", statusLabel: "Overdue" });
    expect(list[1]).toMatchObject({ laneKey: "quoteFollowUp", laneLabel: "Quote", statusLabel: "Waiting" });
    expect(list[2]).toMatchObject({ laneKey: "today", laneLabel: "Today", statusLabel: "Scheduled" });
  });

  it("caps the list at the requested limit", () => {
    const list = buildAttentionList(buildDashboardCommandCenter(sampleInput), { limit: 2 });
    expect(list).toHaveLength(2);
    expect(list[0].laneKey).toBe("moneyToCollect");
  });
});

describe("dashboard command center", () => {
  it("prioritizes today, quote follow-up, and money collection lanes", () => {
    const command = buildDashboardCommandCenter({
      now,
      quotes: [
        {
          id: "quote-1",
          client_name: "Ava Homeowner",
          client_address: "12 Palm Ave",
          client_email: "ava@example.com",
          client_phone: null,
          total: 2400,
          status: "sent",
          created_at: "2026-06-10T00:00:00.000Z",
          updated_at: "2026-06-10T00:00:00.000Z",
          scheduled_start: null,
          sent_via: ["email"],
          line_items: [{ description: "Paint", quantity: 1, unit_price: 2400, total: 2400 }],
          notes: "Follow up",
        },
      ],
      invoices: [
        {
          id: "inv-1",
          invoice_number: "INV-0001",
          client_name: "Ben Client",
          client_email: "ben@example.com",
          client_phone: null,
          status: "sent",
          total: 900,
          amount_paid: 0,
          due_date: "2026-06-16",
          paid_at: null,
          stripe_payment_link: "https://pay.stripe.test/inv-1",
          sent_via: ["email"],
          created_at: "2026-06-10T00:00:00.000Z",
          updated_at: "2026-06-10T00:00:00.000Z",
        },
      ],
      jobs: [
        {
          id: "job-1",
          title: "Install trim",
          status: "scheduled",
          scheduled_start: "2026-06-17T15:00:00.000Z",
          scheduled_end: "2026-06-17T18:00:00.000Z",
          address: "22 Cedar St",
          quote_id: "quote-2",
          created_at: "2026-06-10T00:00:00.000Z",
          updated_at: "2026-06-10T00:00:00.000Z",
        },
      ],
    });

    expect(command.today.items[0]).toMatchObject({
      title: "Install trim",
      actionLabel: "Review job details",
      href: "/jobs",
    });
    expect(command.quoteFollowUp.items[0]).toMatchObject({
      title: "Follow up with Ava Homeowner",
      actionLabel: "Open quote",
      href: "/quotes/quote-1",
    });
    expect(command.moneyToCollect.items[0]).toMatchObject({
      title: "Collect from Ben Client",
      actionLabel: "Open invoice",
      href: "/invoices/inv-1",
    });
    expect(command.moneyToCollect.total).toBe(900);
  });
});
