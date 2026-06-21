import type { QuoteLineItem, QuoteStatus } from "@/types";

export type QuoteWorkflowBucket = "needs_review" | "waiting" | "approved" | "closed";

export type QuoteWorkflowInput = {
  id: string;
  client_name: string;
  client_address?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  total: number | string | null;
  status: QuoteStatus;
  created_at: string;
  updated_at?: string | null;
  scheduled_start?: string | null;
  follow_up_due_at?: string | null;
  last_followed_up_at?: string | null;
  sent_via?: ("email" | "sms")[] | null;
  line_items?: Pick<QuoteLineItem, "description" | "quantity" | "unit_price" | "total">[] | null;
  notes?: string | null;
};

export type QuoteReadinessItem = {
  key: "contact" | "items" | "totals" | "note" | "channel";
  label: string;
  complete: boolean;
  detail: string;
};

export type QuoteWorkflowState = {
  bucket: QuoteWorkflowBucket;
  bucketLabel: string;
  bucketShortLabel: string;
  nextAction: string;
  nextActionDetail: string;
  followUpLabel: string | null;
  followUpTone: "none" | "scheduled" | "due" | "logged";
  deliveryLabel: string;
  deliveryTone: "ready" | "sent" | "missing";
  readiness: QuoteReadinessItem[];
  completedReadiness: number;
  totalReadiness: number;
};

export type QuoteWorkflowSummary = {
  key: QuoteWorkflowBucket;
  label: string;
  shortLabel: string;
  actionLabel: string;
  count: number;
  total: number;
};

type QuoteWorkflowOptions = {
  now?: Date;
};

const bucketOrder: QuoteWorkflowBucket[] = ["needs_review", "waiting", "approved", "closed"];

const bucketCopy: Record<QuoteWorkflowBucket, Pick<QuoteWorkflowSummary, "label" | "shortLabel" | "actionLabel">> = {
  needs_review: {
    label: "Needs review",
    shortLabel: "Review",
    actionLabel: "Review & send",
  },
  waiting: {
    label: "Waiting on client",
    shortLabel: "Waiting",
    actionLabel: "Follow up",
  },
  approved: {
    label: "Approved work",
    shortLabel: "Approved",
    actionLabel: "Create invoice",
  },
  closed: {
    label: "Closed",
    shortLabel: "Closed",
    actionLabel: "Duplicate or archive",
  },
};

export function getQuoteWorkflowState(quote: QuoteWorkflowInput, options: QuoteWorkflowOptions = {}): QuoteWorkflowState {
  const bucket = bucketForStatus(quote.status);
  const copy = bucketCopy[bucket];
  const delivery = getDeliveryState(quote);
  const readiness = getReadiness(quote, delivery.label);
  const followUp = getFollowUpState(quote, options.now ?? new Date());

  return {
    bucket,
    bucketLabel: copy.label,
    bucketShortLabel: copy.shortLabel,
    nextAction: followUp.nextAction ?? copy.actionLabel,
    nextActionDetail: followUp.nextActionDetail ?? nextActionDetail(bucket, delivery.label),
    followUpLabel: followUp.label,
    followUpTone: followUp.tone,
    deliveryLabel: delivery.label,
    deliveryTone: delivery.tone,
    readiness,
    completedReadiness: readiness.filter(item => item.complete).length,
    totalReadiness: readiness.length,
  };
}

export function getQuoteWorkflowSummary(quotes: QuoteWorkflowInput[]): QuoteWorkflowSummary[] {
  return bucketOrder.map(key => {
    const bucketQuotes = quotes.filter(quote => getQuoteWorkflowState(quote).bucket === key);
    return {
      key,
      ...bucketCopy[key],
      count: bucketQuotes.length,
      total: bucketQuotes.reduce((sum, quote) => sum + Number(quote.total ?? 0), 0),
    };
  });
}

export function workflowBucketOptions() {
  return bucketOrder.map(key => ({ key, ...bucketCopy[key] }));
}

function bucketForStatus(status: QuoteStatus): QuoteWorkflowBucket {
  if (status === "draft") return "needs_review";
  if (status === "sent") return "waiting";
  if (status === "approved") return "approved";
  return "closed";
}

function getDeliveryState(quote: QuoteWorkflowInput): {
  label: string;
  tone: QuoteWorkflowState["deliveryTone"];
} {
  const sentVia = quote.sent_via ?? [];
  const hasEmail = Boolean(quote.client_email);
  const hasSms = Boolean(quote.client_phone);

  if (sentVia.includes("email") && sentVia.includes("sms")) {
    return { label: "Email + SMS", tone: "sent" };
  }
  if (sentVia.includes("email")) return { label: "Email sent", tone: "sent" };
  if (sentVia.includes("sms")) return { label: "SMS sent", tone: "sent" };
  if (hasEmail && hasSms) return { label: "Ready for email + SMS", tone: "ready" };
  if (hasEmail) return { label: "Ready for email", tone: "ready" };
  if (hasSms) return { label: "Ready for SMS", tone: "ready" };
  return { label: "Missing contact", tone: "missing" };
}

function getReadiness(quote: QuoteWorkflowInput, deliveryLabel: string): QuoteReadinessItem[] {
  const hasContact = Boolean(quote.client_email || quote.client_phone);
  const lineItems = quote.line_items ?? [];
  const hasLineItems = lineItems.length > 0;
  const hasTotal = Number(quote.total ?? 0) > 0;
  const hasNoteOrAddress = Boolean(quote.notes?.trim() || quote.client_address?.trim());

  return [
    {
      key: "contact",
      label: "Client contact",
      complete: hasContact,
      detail: hasContact ? deliveryLabel : "Add email or phone before sending",
    },
    {
      key: "items",
      label: "Line items",
      complete: hasLineItems,
      detail: hasLineItems ? `${lineItems.length} item${lineItems.length === 1 ? "" : "s"} ready` : "Add at least one line item",
    },
    {
      key: "totals",
      label: "Totals",
      complete: hasTotal,
      detail: hasTotal ? "Subtotal and total calculated" : "Add pricing before sending",
    },
    {
      key: "note",
      label: "Job context",
      complete: hasNoteOrAddress,
      detail: hasNoteOrAddress ? "Client context saved" : "Add address or client note",
    },
    {
      key: "channel",
      label: "Send channel",
      complete: hasContact,
      detail: deliveryLabel,
    },
  ];
}

function nextActionDetail(bucket: QuoteWorkflowBucket, deliveryLabel: string) {
  if (bucket === "needs_review") return deliveryLabel === "Missing contact" ? "Add contact, then send" : "Check the quote, then send";
  if (bucket === "waiting") return "Resend or follow up with the client";
  if (bucket === "approved") return "Convert approved work into an invoice";
  return "Keep for records or duplicate for a similar job";
}

function formatFollowUpDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function getFollowUpState(quote: QuoteWorkflowInput, now: Date): {
  label: string | null;
  tone: QuoteWorkflowState["followUpTone"];
  nextAction: string | null;
  nextActionDetail: string | null;
} {
  if (quote.status !== "sent") {
    return { label: null, tone: "none", nextAction: null, nextActionDetail: null };
  }

  if (!quote.follow_up_due_at) {
    return {
      label: quote.last_followed_up_at ? `Followed up ${formatFollowUpDate(quote.last_followed_up_at)}` : "No follow-up scheduled",
      tone: quote.last_followed_up_at ? "logged" : "none",
      nextAction: null,
      nextActionDetail: null,
    };
  }

  const dueAt = new Date(quote.follow_up_due_at);
  if (dueAt <= now) {
    return {
      label: "Follow-up due",
      tone: "due",
      nextAction: "Follow up now",
      nextActionDetail: "Follow up with the client today",
    };
  }

  const formatted = formatFollowUpDate(quote.follow_up_due_at);
  return {
    label: `Due ${formatted}`,
    tone: "scheduled",
    nextAction: "Follow up",
    nextActionDetail: `Follow up on ${formatted}`,
  };
}
