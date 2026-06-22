import { describe, expect, it } from "vitest";
import { buildTaskrelExportRows, stringifyTaskrelCsv } from "./export-records";

describe("export records", () => {
  it("builds shared quote and invoice rows for exports", () => {
    const rows = buildTaskrelExportRows({
      quotes: [
        {
          id: "quote_1",
          client_name: "APR Painting",
          client_email: "owner@example.com",
          client_phone: "555-0100",
          client_address: "12 Main St",
          trade: "painting",
          status: "sent",
          total: 2400,
          created_at: "2026-06-20T10:00:00.000Z",
        },
      ],
      invoices: [
        {
          invoice_number: "INV-1001",
          client_name: "APR Painting",
          client_email: null,
          status: "paid",
          total: 2400,
          amount_paid: 2400,
          due_date: null,
          paid_at: "2026-06-21T10:00:00.000Z",
          created_at: "2026-06-20T11:00:00.000Z",
        },
      ],
    });

    expect(rows).toEqual([
      ["QUOTES"],
      ["ID", "Client", "Email", "Phone", "Address", "Trade", "Status", "Total", "Created"],
      ["quote_1", "APR Painting", "owner@example.com", "555-0100", "12 Main St", "painting", "sent", "2400", "2026-06-20T10:00:00.000Z"],
      [],
      ["INVOICES"],
      ["Invoice #", "Client", "Email", "Status", "Total", "Paid", "Due Date", "Paid At", "Created"],
      ["INV-1001", "APR Painting", "", "paid", "2400", "2400", "", "2026-06-21T10:00:00.000Z", "2026-06-20T11:00:00.000Z"],
    ]);
  });

  it("escapes CSV values with quotes, commas, and newlines", () => {
    const csv = stringifyTaskrelCsv([
      ["Client", "Address", "Notes"],
      ["A \"Best\" Painting", "12 Main St, Unit 4", "Line one\nLine two"],
    ]);

    expect(csv).toBe(
      [
        "\"Client\",\"Address\",\"Notes\"",
        "\"A \"\"Best\"\" Painting\",\"12 Main St, Unit 4\",\"Line one\nLine two\"",
      ].join("\n")
    );
  });
});
