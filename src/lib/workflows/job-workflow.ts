import type { JobStatus } from "@/types";
import { formatDate, formatTime } from "../format";

export type JobWorkflowBucket = "today" | "upcoming" | "closed";
export type JobWorkflowEffectiveStatus = JobStatus;

export type JobWorkflowInput = {
  id: string;
  title: string;
  status: JobStatus;
  scheduled_start: string;
  scheduled_end?: string | null;
  address?: string | null;
  quote_id?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type JobWorkflowState = {
  bucket: JobWorkflowBucket;
  bucketLabel: string;
  effectiveStatus: JobWorkflowEffectiveStatus;
  nextAction: string;
  nextActionDetail: string;
  proof: { key: "schedule" | "address" | "quote"; label: string; detail: string }[];
};

export function getJobWorkflowState(
  job: JobWorkflowInput,
  options: { now?: Date } = {},
): JobWorkflowState {
  const now = options.now ?? new Date();
  const effectiveStatus = getEffectiveStatus(job, now);
  const bucket = bucketForJob(job, effectiveStatus, now);

  return {
    bucket,
    bucketLabel: bucket === "today" ? "Today" : bucket === "upcoming" ? "Upcoming" : "Closed",
    effectiveStatus,
    nextAction: getNextAction(effectiveStatus, bucket),
    nextActionDetail: getNextActionDetail(job, effectiveStatus, now),
    proof: getProof(job, now),
  };
}

function getEffectiveStatus(job: JobWorkflowInput, now: Date): JobWorkflowEffectiveStatus {
  if (job.status === "completed" || job.status === "canceled") return job.status;
  const start = new Date(job.scheduled_start);
  const end = job.scheduled_end ? new Date(job.scheduled_end) : endOfDay(start);
  if (start.getTime() <= now.getTime() && now.getTime() <= end.getTime()) return "in_progress";
  return "scheduled";
}

function bucketForJob(job: JobWorkflowInput, status: JobWorkflowEffectiveStatus, now: Date): JobWorkflowBucket {
  if (status === "completed" || status === "canceled") return "closed";
  if (status === "in_progress" || isSameDay(job.scheduled_start, now)) return "today";
  return "upcoming";
}

function getNextAction(status: JobWorkflowEffectiveStatus, bucket: JobWorkflowBucket) {
  if (status === "in_progress") return "Mark job complete";
  if (bucket === "today") return "Review job details";
  if (status === "scheduled") return "Review job details";
  return "View job record";
}

function getNextActionDetail(job: JobWorkflowInput, status: JobWorkflowEffectiveStatus, now: Date) {
  if (status === "in_progress") return "The scheduled window is active";
  if (status === "completed") return "Completion is recorded";
  if (status === "canceled") return "This job is canceled";
  if (isSameDay(job.scheduled_start, now)) return `Scheduled today at ${formatTime(job.scheduled_start)}`;
  return `Scheduled ${formatDate(job.scheduled_start)} at ${formatTime(job.scheduled_start)}`;
}

function getProof(job: JobWorkflowInput, now: Date): JobWorkflowState["proof"] {
  const proof: JobWorkflowState["proof"] = [{
    key: "schedule",
    label: isSameDay(job.scheduled_start, now) ? "Scheduled today" : `Scheduled ${formatDate(job.scheduled_start)}`,
    detail: formatTime(job.scheduled_start),
  }];
  if (job.address) proof.push({ key: "address", label: "Address saved", detail: job.address });
  if (job.quote_id) proof.push({ key: "quote", label: "Linked quote", detail: "Quote record is connected" });
  return proof;
}

function isSameDay(value: string, now: Date) {
  return new Date(value).toDateString() === now.toDateString();
}

function endOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}
