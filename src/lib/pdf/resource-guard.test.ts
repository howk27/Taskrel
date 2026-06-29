import { describe, expect, it } from "vitest";
import { isBlockedIp, isBlockedResourceUrl, isBlockedResourceUrlResolved } from "./resource-guard";

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

describe("isBlockedIp", () => {
  it("blocks loopback, private, and link-local IPv4", () => {
    for (const ip of ["0.0.0.0", "10.0.0.5", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1"]) {
      expect(isBlockedIp(ip)).toBe(true);
    }
  });

  it("allows public IPv4", () => {
    for (const ip of ["8.8.8.8", "93.184.216.34", "172.15.0.1", "172.32.0.1"]) {
      expect(isBlockedIp(ip)).toBe(false);
    }
  });

  it("blocks IPv6 loopback, unique-local, and link-local", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1"]) {
      expect(isBlockedIp(ip)).toBe(true);
    }
  });

  it("allows public IPv6", () => {
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
  });

  it("classifies IPv4-mapped IPv6 by the embedded IPv4", () => {
    expect(isBlockedIp("::ffff:10.0.0.1")).toBe(true);
    expect(isBlockedIp("::ffff:8.8.8.8")).toBe(false);
  });
});

describe("isBlockedResourceUrlResolved", () => {
  const lookupTo = (...ips: string[]) => async () => ips;

  it("allows a public host that resolves to a public IP", async () => {
    expect(await isBlockedResourceUrlResolved("https://cdn.example.com/logo.png", lookupTo("93.184.216.34"))).toBe(false);
  });

  it("blocks a public host that resolves to a private IP (DNS rebinding)", async () => {
    expect(await isBlockedResourceUrlResolved("https://evil.example.com/logo.png", lookupTo("10.0.0.5"))).toBe(true);
  });

  it("blocks when ANY resolved address is private (round-robin rebinding)", async () => {
    expect(await isBlockedResourceUrlResolved("https://evil.example.com/logo.png", lookupTo("93.184.216.34", "169.254.169.254"))).toBe(true);
  });

  it("fails closed when resolution throws", async () => {
    const lookup = async () => { throw new Error("ENOTFOUND"); };
    expect(await isBlockedResourceUrlResolved("https://nope.example.com/logo.png", lookup)).toBe(true);
  });

  it("fails closed when resolution returns no addresses", async () => {
    expect(await isBlockedResourceUrlResolved("https://nope.example.com/logo.png", lookupTo())).toBe(true);
  });

  it("short-circuits on a scheme/host already blocked by the sync guard, without resolving", async () => {
    let called = false;
    const lookup = async () => { called = true; return ["93.184.216.34"]; };
    expect(await isBlockedResourceUrlResolved("http://example.com/logo.png", lookup)).toBe(true);
    expect(called).toBe(false);
  });
});
