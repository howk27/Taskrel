import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("formats ISO midnight dates without drifting across time zones", () => {
    expect(formatDate("2026-06-24T00:00:00.000Z")).toBe("Jun 24, 2026");
  });
});
