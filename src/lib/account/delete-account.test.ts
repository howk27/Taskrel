import { describe, expect, it } from "vitest";
import { confirmationMatches, dedupeStoragePaths } from "./delete-account";

describe("confirmationMatches", () => {
  it("matches the account email case-insensitively and trimmed", () => {
    expect(confirmationMatches("  Owner@Taskrel.com ", "owner@taskrel.com")).toBe(true);
    expect(confirmationMatches("owner@taskrel.com", "owner@taskrel.com")).toBe(true);
  });

  it("rejects a different address", () => {
    expect(confirmationMatches("someone@else.com", "owner@taskrel.com")).toBe(false);
  });

  it("never treats empty or non-string input as a match", () => {
    expect(confirmationMatches("", "owner@taskrel.com")).toBe(false);
    expect(confirmationMatches("   ", "owner@taskrel.com")).toBe(false);
    expect(confirmationMatches(undefined, "owner@taskrel.com")).toBe(false);
    expect(confirmationMatches("anything", "")).toBe(false);
  });
});

describe("dedupeStoragePaths", () => {
  it("drops blanks and duplicates", () => {
    expect(
      dedupeStoragePaths(["a/1.pdf", "a/1.pdf", " ", null, undefined, "a/2.pdf"]),
    ).toEqual(["a/1.pdf", "a/2.pdf"]);
  });

  it("returns an empty array when nothing is removable", () => {
    expect(dedupeStoragePaths([null, "  ", undefined])).toEqual([]);
  });
});
