import { formatCurrency } from "@/lib/format";

export type InsightTone = "info" | "success" | "warning" | "danger" | "ai";

export type InsightCard = {
  id: string;
  title: string;
  body: string;
  tone: InsightTone;
  href?: string;
  actionLabel?: string;
  value?: string;
};

export type ChartPoint = {
  label: string;
  value: number;
  secondary?: number;
};

export type TaskrelInsights = {
  summaryMetrics: {
    activeQuoteValue: number;
    unpaidInvoiceValue: number;
    scheduledJobsCount: number;
    paidThisMonth: number;
  };
  charts: {
    quotePipeline: ChartPoint[];
    revenueTrend: ChartPoint[];
    invoiceAging: ChartPoint[];
    scheduleDensity: ChartPoint[];
  };
  nextActions: InsightCard[];
  risks: InsightCard[];
};

type QuoteInsightRow = {
  id: string;
  client_name: string;
  total: number | string;
  status: string;
  created_at: string;
  scheduled_start?: string | null;
};

type InvoiceInsightRow = {
  id: string;
  client_name: string;
  total: number | string;
  amount_paid?: number | string | null;
  status: string;
  due_date?: string | null;
  paid_at?: string | null;
  created_at: string;
};

type JobInsightRow = {
  id: string;
  title: string;
  status: string;
  scheduled_start: string;
};

type ClientInsightRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

function amount(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysBetween(date: string, now = new Date()) {
  return Math.floor((now.getTime() - new Date(date).getTime()) / 86_400_000);
}

function monthKey(date: Date) {
  return date.toLocaleString("en-US", { month: "short" });
}

export function buildTaskrelInsights({
  quotes,
  invoices,
  jobs,
  clients,
  now = new Date(),
}: {
  quotes: QuoteInsightRow[];
  invoices: InvoiceInsightRow[];
  jobs: JobInsightRow[];
  clients: ClientInsightRow[];
  now?: Date;
}): TaskrelInsights {
  const quoteStages = ["draft", "sent", "approved", "rejected", "expired"];
  const quotePipeline = quoteStages.map(status => ({
    label: status[0].toUpperCase() + status.slice(1),
    value: quotes.filter(quote => quote.status === status).reduce((sum, quote) => sum + amount(quote.total), 0),
    secondary: quotes.filter(quote => quote.status === status).length,
  }));

  const unpaidInvoices = invoices.filter(invoice => ["draft", "sent", "overdue"].includes(invoice.status));
  const unpaidInvoiceValue = unpaidInvoices.reduce((sum, invoice) => sum + amount(invoice.total) - amount(invoice.amount_paid), 0);
  const activeQuoteValue = quotes
    .filter(quote => ["draft", "sent", "approved"].includes(quote.status))
    .reduce((sum, quote) => sum + amount(quote.total), 0);

  const revenueTrend = Array.from({ length: 6 }).map((_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const value = invoices
      .filter(invoice => invoice.status === "paid" && invoice.paid_at)
      .filter(invoice => {
        const paid = new Date(invoice.paid_at!);
        return paid.getFullYear() === month.getFullYear() && paid.getMonth() === month.getMonth();
      })
      .reduce((sum, invoice) => sum + amount(invoice.total), 0);
    return { label: monthKey(month), value };
  });

  const invoiceAging = [
    { label: "Current", value: 0 },
    { label: "1-15", value: 0 },
    { label: "16-30", value: 0 },
    { label: "30+", value: 0 },
  ];

  unpaidInvoices.forEach(invoice => {
    const due = invoice.due_date ? daysBetween(invoice.due_date, now) : 0;
    const value = amount(invoice.total) - amount(invoice.amount_paid);
    if (due <= 0) invoiceAging[0].value += value;
    else if (due <= 15) invoiceAging[1].value += value;
    else if (due <= 30) invoiceAging[2].value += value;
    else invoiceAging[3].value += value;
  });

  const scheduleDensity = Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() + index);
    const value = jobs.filter(job => {
      const scheduled = new Date(job.scheduled_start);
      return scheduled.toDateString() === day.toDateString() && ["scheduled", "in_progress"].includes(job.status);
    }).length;
    return { label: day.toLocaleDateString("en-US", { weekday: "short" }), value };
  });

  const sentQuotes = quotes.filter(quote => quote.status === "sent");
  const staleQuote = sentQuotes
    .filter(quote => daysBetween(quote.created_at, now) >= 3)
    .sort((a, b) => amount(b.total) - amount(a.total))[0];
  const highValueDraft = quotes
    .filter(quote => quote.status === "draft")
    .sort((a, b) => amount(b.total) - amount(a.total))[0];
  const nextJob = jobs
    .filter(job => ["scheduled", "in_progress"].includes(job.status))
    .filter(job => new Date(job.scheduled_start) >= now)
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())[0];
  const incompleteClient = clients.find(client => !client.email || !client.phone);

  const nextActions: InsightCard[] = [];
  if (staleQuote) {
    nextActions.push({
      id: "stale-quote",
      title: `Follow up with ${staleQuote.client_name}`,
      body: `This sent quote has been open for ${daysBetween(staleQuote.created_at, now)} days. A short follow-up could recover ${formatCurrency(staleQuote.total)}.`,
      tone: "warning",
      href: `/quotes/${staleQuote.id}`,
      actionLabel: "Open quote",
      value: formatCurrency(staleQuote.total),
    });
  }
  if (highValueDraft) {
    nextActions.push({
      id: "draft-value",
      title: `Review ${highValueDraft.client_name}`,
      body: `Your largest draft is worth ${formatCurrency(highValueDraft.total)} and is ready for review before sending.`,
      tone: "info",
      href: `/quotes/${highValueDraft.id}`,
      actionLabel: "Review draft",
      value: formatCurrency(highValueDraft.total),
    });
  }
  if (nextJob) {
    nextActions.push({
      id: "next-job",
      title: "Next scheduled job",
      body: `${nextJob.title} is the next job on your calendar.`,
      tone: "success",
      href: "/jobs",
      actionLabel: "View jobs",
    });
  }
  if (nextActions.length === 0) {
    nextActions.push({
      id: "create-quote",
      title: "Create the next quote",
      body: "No urgent follow-ups right now. Start a new estimate when the next client calls.",
      tone: "success",
      href: "/quotes/new",
      actionLabel: "New quote",
    });
  }

  const risks: InsightCard[] = [];
  if (unpaidInvoiceValue > 0) {
    risks.push({
      id: "unpaid-invoices",
      title: "Unpaid invoice balance",
      body: `${formatCurrency(unpaidInvoiceValue)} is still unpaid across draft, sent, or overdue invoices.`,
      tone: "danger",
      href: "/invoices",
      actionLabel: "Review invoices",
      value: formatCurrency(unpaidInvoiceValue),
    });
  }
  if (incompleteClient) {
    risks.push({
      id: "client-contact",
      title: "Client contact missing",
      body: `${incompleteClient.name} is missing ${!incompleteClient.email ? "email" : "phone"} info, which can slow quote and invoice delivery.`,
      tone: "warning",
      href: "/clients",
      actionLabel: "Open clients",
    });
  }

  const paidThisMonth = invoices
    .filter(invoice => invoice.status === "paid" && invoice.paid_at)
    .filter(invoice => {
      const paid = new Date(invoice.paid_at!);
      return paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth();
    })
    .reduce((sum, invoice) => sum + amount(invoice.total), 0);

  return {
    summaryMetrics: {
      activeQuoteValue,
      unpaidInvoiceValue,
      scheduledJobsCount: jobs.filter(job => ["scheduled", "in_progress"].includes(job.status)).length,
      paidThisMonth,
    },
    charts: {
      quotePipeline,
      revenueTrend,
      invoiceAging,
      scheduleDensity,
    },
    nextActions,
    risks,
  };
}
