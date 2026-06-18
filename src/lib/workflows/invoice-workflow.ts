import type { InvoiceStatus } from "@/types";
import { formatCurrency, formatDate } from "../format";

export type InvoiceWorkflowBucket = "prepare" | "collect" | "closed";
export type InvoiceWorkflowEffectiveStatus = InvoiceStatus;

export type InvoiceWorkflowInput = {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  status: InvoiceStatus;
  total: number | string | null;
  amount_paid?: number | string | null;
  due_date?: string | null;
  paid_at?: string | null;
  stripe_payment_link?: string | null;
  sent_via?: ("email" | "sms")[] | null;
  created_at: string;
  updated_at?: string | null;
};

export type InvoiceWorkflowProof = {
  key: "sent" | "payment_link" | "due" | "paid" | "balance";
  label: string;
  detail: string;
};

export type InvoiceWorkflowBlocker = {
  key: "contact" | "payment_link" | "total";
  label: string;
  detail: string;
};

export type InvoiceWorkflowState = {
  bucket: InvoiceWorkflowBucket;
  bucketLabel: string;
  effectiveStatus: InvoiceWorkflowEffectiveStatus;
  nextAction: string;
  nextActionDetail: string;
  balanceDue: number;
  paymentLabel: string;
  proof: InvoiceWorkflowProof[];
  blockers: InvoiceWorkflowBlocker[];
};

export type InvoiceWorkflowSummary = {
  key: InvoiceWorkflowBucket;
  label: string;
  actionLabel: string;
  count: number;
  total: number;
};

const bucketCopy: Record<InvoiceWorkflowBucket, Pick<InvoiceWorkflowSummary, "label" | "actionLabel">> = {
  prepare: {
    label: "Prepare",
    actionLabel: "Send invoice",
  },
  collect: {
    label: "Collect",
    actionLabel: "Follow up",
  },
  closed: {
    label: "Closed",
    actionLabel: "View proof",
  },
};

export function getInvoiceWorkflowState(
  invoice: InvoiceWorkflowInput,
  options: { now?: Date } = {},
): InvoiceWorkflowState {
  const now = options.now ?? new Date();
  const total = amount(invoice.total);
  const amountPaid = amount(invoice.amount_paid);
  const balanceDue = Math.max(total - amountPaid, 0);
  const effectiveStatus = getEffectiveStatus(invoice, balanceDue, now);
  const bucket = bucketForStatus(effectiveStatus);
  const blockers = getBlockers(invoice, total);
  const proof = getProof(invoice, balanceDue);
  const nextAction = getNextAction(effectiveStatus, blockers);

  return {
    bucket,
    bucketLabel: bucketCopy[bucket].label,
    effectiveStatus,
    nextAction,
    nextActionDetail: getNextActionDetail(effectiveStatus, balanceDue, blockers),
    balanceDue,
    paymentLabel: balanceDue > 0 ? `${formatCurrency(balanceDue)} left to collect` : "Paid in full",
    proof,
    blockers,
  };
}

export function getInvoiceWorkflowSummary(
  invoices: InvoiceWorkflowInput[],
  options: { now?: Date } = {},
): InvoiceWorkflowSummary[] {
  return (["prepare", "collect", "closed"] as InvoiceWorkflowBucket[]).map(key => {
    const bucketInvoices = invoices.filter(invoice => getInvoiceWorkflowState(invoice, options).bucket === key);
    return {
      key,
      ...bucketCopy[key],
      count: bucketInvoices.length,
      total: bucketInvoices.reduce((sum, invoice) => {
        const state = getInvoiceWorkflowState(invoice, options);
        return sum + state.balanceDue;
      }, 0),
    };
  });
}

function getEffectiveStatus(
  invoice: InvoiceWorkflowInput,
  balanceDue: number,
  now: Date,
): InvoiceWorkflowEffectiveStatus {
  if (invoice.status === "void") return "void";
  if (invoice.status === "paid" || invoice.paid_at || balanceDue <= 0) return "paid";
  if (invoice.status === "draft") return "draft";
  if (invoice.due_date && isBeforeToday(invoice.due_date, now)) return "overdue";
  return "sent";
}

function bucketForStatus(status: InvoiceWorkflowEffectiveStatus): InvoiceWorkflowBucket {
  if (status === "draft") return "prepare";
  if (status === "paid" || status === "void") return "closed";
  return "collect";
}

function getNextAction(status: InvoiceWorkflowEffectiveStatus, blockers: InvoiceWorkflowBlocker[]) {
  const contactBlocker = blockers.find(blocker => blocker.key === "contact");
  const totalBlocker = blockers.find(blocker => blocker.key === "total");
  if (status === "draft" && contactBlocker) return "Add client contact";
  if (status === "draft" && totalBlocker) return "Fix invoice total";
  if (status === "draft") return "Send invoice";
  if (status === "overdue") return "Follow up on payment";
  if (status === "sent") return "Resend or copy payment link";
  if (status === "paid") return "View payment proof";
  return "Keep invoice record";
}

function getNextActionDetail(
  status: InvoiceWorkflowEffectiveStatus,
  balanceDue: number,
  blockers: InvoiceWorkflowBlocker[],
) {
  if (blockers.length > 0 && status === "draft") return blockers[0].detail;
  if (status === "overdue") return `${formatCurrency(balanceDue)} is past due`;
  if (status === "sent") return `${formatCurrency(balanceDue)} is still unpaid`;
  if (status === "paid") return "Payment evidence is saved on this invoice";
  if (status === "void") return "No collection action is needed";
  return "Invoice is ready to send";
}

function getBlockers(invoice: InvoiceWorkflowInput, total: number): InvoiceWorkflowBlocker[] {
  const blockers: InvoiceWorkflowBlocker[] = [];
  if (!invoice.client_email && !invoice.client_phone) {
    blockers.push({
      key: "contact",
      label: "Client contact",
      detail: "Add email or phone before sending",
    });
  }
  if (total <= 0) {
    blockers.push({
      key: "total",
      label: "Invoice total",
      detail: "Add invoice line items before sending",
    });
  }
  if (!invoice.stripe_payment_link) {
    blockers.push({
      key: "payment_link",
      label: "Payment link",
      detail: "Send can still work, but Stripe payment collection is not ready",
    });
  }
  return blockers;
}

function getProof(invoice: InvoiceWorkflowInput, balanceDue: number): InvoiceWorkflowProof[] {
  const proof: InvoiceWorkflowProof[] = [];
  const sentVia = invoice.sent_via ?? [];
  if (sentVia.length > 0) {
    proof.push({
      key: "sent",
      label: `Sent by ${sentVia.map(labelChannel).join(" + ")}`,
      detail: "Delivery action completed",
    });
  }
  if (invoice.stripe_payment_link) {
    proof.push({
      key: "payment_link",
      label: "Payment link ready",
      detail: "Client can pay online",
    });
  }
  if (invoice.due_date && balanceDue > 0) {
    proof.push({
      key: "due",
      label: `Due ${formatDateOnly(invoice.due_date)}`,
      detail: "Due date controls overdue status",
    });
  }
  if (invoice.paid_at || balanceDue <= 0) {
    proof.push({
      key: "paid",
      label: `Paid ${formatDate(invoice.paid_at ?? invoice.updated_at ?? invoice.created_at)}`,
      detail: "Payment is recorded",
    });
  }
  return proof;
}

function amount(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isBeforeToday(value: string, now: Date) {
  const due = new Date(`${value}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function labelChannel(channel: "email" | "sms") {
  return channel === "sms" ? "SMS" : "email";
}

function formatDateOnly(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
