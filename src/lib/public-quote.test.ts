import { describe, expect, it } from "vitest";
import { buildPublicQuoteUrl, canApprovePublicQuoteStatus, generatePublicQuoteToken, renderPublicQuoteEmailHtml, renderApprovalNotificationHtml, renderResendRequestHtml } from "./public-quote";

describe("public quote helpers", () => {
  it("generates url-safe quote tokens", () => {
    const token = generatePublicQuoteToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it("builds a public quote url from a base url and token", () => {
    expect(buildPublicQuoteUrl("https://taskrel.com/", "quote_token_123")).toBe(
      "https://taskrel.com/q/quote_token_123",
    );
  });

  it("wraps rendered quote html with a clear approval link", () => {
    const html = renderPublicQuoteEmailHtml({
      quoteHtml: "<section>Quote body</section>",
      quoteUrl: "https://taskrel.com/q/token",
      businessName: "Taskrel Painting",
    });

    expect(html).toContain("Taskrel Painting sent you a quote");
    expect(html).toContain("https://taskrel.com/q/token");
    expect(html).toContain("View and approve quote");
    expect(html).toContain("<section>Quote body</section>");
  });

  it("only allows active quote statuses to be approved from the public link", () => {
    expect(canApprovePublicQuoteStatus("draft")).toBe(true);
    expect(canApprovePublicQuoteStatus("sent")).toBe(true);
    expect(canApprovePublicQuoteStatus("approved")).toBe(true);
    expect(canApprovePublicQuoteStatus("rejected")).toBe(false);
    expect(canApprovePublicQuoteStatus("expired")).toBe(false);
  });
});

describe("renderApprovalNotificationHtml", () => {
  it("contains the client name and quote URL", () => {
    const html = renderApprovalNotificationHtml({
      clientName: "Jane Doe",
      quoteUrl: "https://app.example.com/quotes/abc",
    });
    expect(html).toContain("Jane Doe");
    expect(html).toContain("https://app.example.com/quotes/abc");
  });

  it("escapes HTML in client name", () => {
    const html = renderApprovalNotificationHtml({
      clientName: '<script>alert("xss")</script>',
      quoteUrl: "https://app.example.com/quotes/abc",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderResendRequestHtml", () => {
  it("contains the client name and quote URL", () => {
    const html = renderResendRequestHtml({
      clientName: "John Smith",
      clientAddress: "123 Main St",
      quoteUrl: "https://app.example.com/quotes/abc",
    });
    expect(html).toContain("John Smith");
    expect(html).toContain("123 Main St");
    expect(html).toContain("https://app.example.com/quotes/abc");
  });

  it("omits address line when clientAddress is null", () => {
    const html = renderResendRequestHtml({
      clientName: "John Smith",
      clientAddress: null,
      quoteUrl: "https://app.example.com/quotes/abc",
    });
    expect(html).not.toContain("null");
    expect(html).toContain("John Smith");
  });
});
