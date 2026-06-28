import { getQuoteWorkflowState, type QuoteWorkflowInput } from "../../components/quotes/quote-workflow-model";
import { formatDate, formatTime } from "../format";
import { getInvoiceWorkflowState, type InvoiceWorkflowInput } from "./invoice-workflow";
import { getJobWorkflowState, type JobWorkflowInput } from "./job-workflow";

export type DashboardCommandItem = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  /** Short status word (e.g. "Overdue", "Waiting", "Scheduled") — the text companion to `tone` so status is never color-only. */
  statusLabel: string;
  href: string;
  value?: number;
  meta?: string;
  tone: "info" | "success" | "warning" | "danger";
};

/** "in_progress" → "In progress". */
function prettyStatus(status: string): string {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export type DashboardCommandLane = {
  key: "today" | "quoteFollowUp" | "moneyToCollect";
  title: string;
  subtitle: string;
  total: number;
  items: DashboardCommandItem[];
  emptyTitle: string;
  emptyBody: string;
};

export type DashboardCommandCenter = {
  today: DashboardCommandLane;
  quoteFollowUp: DashboardCommandLane;
  moneyToCollect: DashboardCommandLane;
};

export type AttentionItem = DashboardCommandItem & {
  laneKey: DashboardCommandLane["key"];
  laneLabel: string;
};

const LANE_LABEL: Record<DashboardCommandLane["key"], string> = {
  today: "Today",
  quoteFollowUp: "Quote",
  moneyToCollect: "Invoice",
};

const TONE_RANK: Record<DashboardCommandItem["tone"], number> = {
  danger: 3,
  warning: 2,
  info: 1,
  success: 0,
};

/**
 * Flattens the three command lanes into one severity-ranked stream for the
 * mobile dashboard: most urgent first (overdue → waiting → today → rest),
 * tie-broken by amount. Each item is tagged with its originating lane.
 */
export function buildAttentionList(
  center: DashboardCommandCenter,
  { limit = 6 }: { limit?: number } = {},
): AttentionItem[] {
  const lanes: DashboardCommandLane[] = [center.today, center.quoteFollowUp, center.moneyToCollect];
  return lanes
    .flatMap(lane =>
      lane.items.map(item => ({ ...item, laneKey: lane.key, laneLabel: LANE_LABEL[lane.key] })),
    )
    .sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone] || (b.value ?? 0) - (a.value ?? 0))
    .slice(0, limit);
}

export function buildDashboardCommandCenter({
  quotes,
  invoices,
  jobs,
  now = new Date(),
}: {
  quotes: QuoteWorkflowInput[];
  invoices: InvoiceWorkflowInput[];
  jobs: JobWorkflowInput[];
  now?: Date;
}): DashboardCommandCenter {
  const todayJobs = jobs
    .map(job => ({ job, state: getJobWorkflowState(job, { now }) }))
    .filter(({ state }) => state.bucket === "today")
    .sort((a, b) => new Date(a.job.scheduled_start).getTime() - new Date(b.job.scheduled_start).getTime())
    .slice(0, 4);

  const quoteFollowUps = quotes
    .map(quote => ({ quote, state: getQuoteWorkflowState(quote), age: daysBetween(quote.created_at, now) }))
    .filter(({ state, age }) => state.bucket === "waiting" || state.bucket === "needs_review" || (state.bucket === "approved" && age >= 1))
    .sort((a, b) => scoreQuote(b.state.bucket, b.age, b.quote.total) - scoreQuote(a.state.bucket, a.age, a.quote.total))
    .slice(0, 4);

  const invoicesToCollect = invoices
    .map(invoice => ({ invoice, state: getInvoiceWorkflowState(invoice, { now }) }))
    .filter(({ state }) => state.bucket === "collect" || state.bucket === "prepare")
    .sort((a, b) => scoreInvoice(b.state.effectiveStatus, b.state.balanceDue) - scoreInvoice(a.state.effectiveStatus, a.state.balanceDue))
    .slice(0, 4);

  return {
    today: {
      key: "today",
      title: "Today",
      subtitle: "Work already on the clock",
      total: todayJobs.length,
      items: todayJobs.map(({ job, state }) => ({
        id: job.id,
        title: job.title,
        body: state.nextActionDetail,
        actionLabel: state.nextAction,
        statusLabel: prettyStatus(state.effectiveStatus),
        href: "/jobs",
        meta: job.address ?? `${formatDate(job.scheduled_start)} ${formatTime(job.scheduled_start)}`,
        tone: state.effectiveStatus === "in_progress" ? "warning" : "info",
      })),
      emptyTitle: "Nothing scheduled today",
      emptyBody: "Approved quotes with dates will show here before the job starts.",
    },
    quoteFollowUp: {
      key: "quoteFollowUp",
      title: "Quote follow-up",
      subtitle: "Quotes that can turn into work",
      total: quoteFollowUps.reduce((sum, item) => sum + amount(item.quote.total), 0),
      items: quoteFollowUps.map(({ quote, state, age }) => ({
        id: quote.id,
        title: state.bucket === "waiting" ? `Follow up with ${quote.client_name}` : quote.client_name,
        body: state.bucket === "waiting" ? `Sent ${age} day${age === 1 ? "" : "s"} ago. ${state.nextActionDetail}.` : state.nextActionDetail,
        actionLabel: "Open quote",
        statusLabel: state.bucketShortLabel,
        href: `/quotes/${quote.id}`,
        value: amount(quote.total),
        meta: state.deliveryLabel,
        tone: state.bucket === "waiting" ? "warning" : state.bucket === "approved" ? "success" : "info",
      })),
      emptyTitle: "No quotes need attention",
      emptyBody: "Drafts, follow-ups, and approved work will land here.",
    },
    moneyToCollect: {
      key: "moneyToCollect",
      title: "Money to collect",
      subtitle: "Invoices that need payment movement",
      total: invoicesToCollect.reduce((sum, item) => sum + item.state.balanceDue, 0),
      items: invoicesToCollect.map(({ invoice, state }) => ({
        id: invoice.id,
        title: state.effectiveStatus === "draft" ? `Send invoice to ${invoice.client_name}` : `Collect from ${invoice.client_name}`,
        body: state.nextActionDetail,
        actionLabel: "Open invoice",
        statusLabel: prettyStatus(state.effectiveStatus),
        href: `/invoices/${invoice.id}`,
        value: state.balanceDue,
        meta: state.paymentLabel,
        tone: state.effectiveStatus === "overdue" ? "danger" : state.effectiveStatus === "draft" ? "info" : "warning",
      })),
      emptyTitle: "No invoice collection work",
      emptyBody: "Sent, overdue, and draft invoices will show here when they need action.",
    },
  };
}

function daysBetween(date: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 86_400_000));
}

function amount(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreQuote(bucket: string, age: number, total: number | string | null | undefined) {
  const bucketScore = bucket === "waiting" ? 10_000 : bucket === "approved" ? 7_000 : 5_000;
  return bucketScore + age * 100 + amount(total) / 10;
}

function scoreInvoice(status: string, balanceDue: number) {
  const statusScore = status === "overdue" ? 10_000 : status === "sent" ? 8_000 : 5_000;
  return statusScore + balanceDue / 10;
}
