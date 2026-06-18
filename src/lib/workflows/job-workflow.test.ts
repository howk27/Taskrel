import { describe, expect, it } from "vitest";
import { getJobWorkflowState } from "./job-workflow";

const now = new Date("2026-06-17T14:00:00.000Z");

const baseJob = {
  id: "job-1",
  title: "Ava Homeowner job",
  status: "scheduled" as const,
  scheduled_start: "2026-06-17T13:00:00.000Z",
  scheduled_end: "2026-06-17T16:00:00.000Z",
  address: "12 Palm Ave",
  quote_id: "quote-1",
  created_at: "2026-06-10T00:00:00.000Z",
  updated_at: "2026-06-10T00:00:00.000Z",
};

describe("job workflow model", () => {
  it("derives current work from the schedule window", () => {
    const state = getJobWorkflowState(baseJob, { now });

    expect(state.effectiveStatus).toBe("in_progress");
    expect(state.bucket).toBe("today");
    expect(state.nextAction).toBe("Mark job complete");
    expect(state.proof.map(item => item.label)).toContain("Scheduled today");
  });

  it("keeps future scheduled jobs in upcoming work", () => {
    const state = getJobWorkflowState({
      ...baseJob,
      scheduled_start: "2026-06-18T13:00:00.000Z",
      scheduled_end: "2026-06-18T16:00:00.000Z",
    }, { now });

    expect(state.effectiveStatus).toBe("scheduled");
    expect(state.bucket).toBe("upcoming");
    expect(state.nextAction).toBe("Review job details");
  });

  it("respects explicit closed statuses", () => {
    const completed = getJobWorkflowState({ ...baseJob, status: "completed" }, { now });
    const canceled = getJobWorkflowState({ ...baseJob, status: "canceled" }, { now });

    expect(completed.bucket).toBe("closed");
    expect(completed.nextAction).toBe("View job record");
    expect(canceled.bucket).toBe("closed");
    expect(canceled.effectiveStatus).toBe("canceled");
  });
});
