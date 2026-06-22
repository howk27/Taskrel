export type ExportQuoteRow = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  trade: string;
  status: string;
  total: number | string | null;
  created_at: string;
};

export type ExportInvoiceRow = {
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  status: string;
  total: number | string | null;
  amount_paid: number | string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
};

export function buildTaskrelExportRows({
  quotes,
  invoices,
}: {
  quotes: ExportQuoteRow[];
  invoices: ExportInvoiceRow[];
}): string[][] {
  return [
    ["QUOTES"],
    ["ID", "Client", "Email", "Phone", "Address", "Trade", "Status", "Total", "Created"],
    ...quotes.map((quote) => [
      quote.id,
      quote.client_name,
      quote.client_email ?? "",
      quote.client_phone ?? "",
      quote.client_address ?? "",
      quote.trade,
      quote.status,
      value(quote.total),
      quote.created_at,
    ]),
    [],
    ["INVOICES"],
    ["Invoice #", "Client", "Email", "Status", "Total", "Paid", "Due Date", "Paid At", "Created"],
    ...invoices.map((invoice) => [
      invoice.invoice_number,
      invoice.client_name,
      invoice.client_email ?? "",
      invoice.status,
      value(invoice.total),
      value(invoice.amount_paid),
      invoice.due_date ?? "",
      invoice.paid_at ?? "",
      invoice.created_at,
    ]),
  ];
}

export function stringifyTaskrelCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function value(input: number | string | null) {
  if (input === null) return "";
  return String(input);
}
