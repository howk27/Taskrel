import { describe, expect, it } from "vitest";
import { isBlockedResourceUrl } from "./resource-guard";

describe("isBlockedResourceUrl", () => {
  it("allows https images on public hosts", () => {
    expect(isBlockedResourceUrl("https://cdn.example.com/logo.png")).toBe(false);
    expect(isBlockedResourceUrl("https://storage.googleapis.com/bucket/logo.svg")).toBe(false);
  });

  it("blocks non-https schemes", () => {
    for (const url of [
      "file:///etc/passwd",
      "http://example.com/logo.png",
      "data:image/png;base64,iVBORw0KGgo=",
      "ftp://example.com/logo.png",
      "blob:https://example.com/abc",
    ]) {
      expect(isBlockedResourceUrl(url)).toBe(true);
    }
  });

  it("blocks localhost and loopback", () => {
    for (const url of [
      "https://localhost/logo.png",
      "https://app.localhost/logo.png",
      "https://127.0.0.1/logo.png",
      "https://[::1]/logo.png",
    ]) {
      expect(isBlockedResourceUrl(url)).toBe(true);
    }
  });

  it("blocks cloud-metadata and private IPv4 ranges", () => {
    for (const url of [
      "https://169.254.169.254/latest/meta-data/",
      "https://10.0.0.5/logo.png",
      "https://172.16.4.4/logo.png",
      "https://172.31.255.255/logo.png",
      "https://192.168.1.10/logo.png",
      "https://0.0.0.0/logo.png",
    ]) {
      expect(isBlockedResourceUrl(url)).toBe(true);
    }
  });

  it("blocks raw IPv6 literals", () => {
    expect(isBlockedResourceUrl("https://[fd00::1]/logo.png")).toBe(true);
    expect(isBlockedResourceUrl("https://[fe80::1]/logo.png")).toBe(true);
  });

  it("blocks malformed urls", () => {
    expect(isBlockedResourceUrl("not a url")).toBe(true);
    expect(isBlockedResourceUrl("")).toBe(true);
  });

  it("does not over-block public IPv4", () => {
    expect(isBlockedResourceUrl("https://8.8.8.8/logo.png")).toBe(false);
    expect(isBlockedResourceUrl("https://172.15.0.1/logo.png")).toBe(false);
    expect(isBlockedResourceUrl("https://172.32.0.1/logo.png")).toBe(false);
  });
});
