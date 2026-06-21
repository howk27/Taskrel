import { randomBytes } from "crypto";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generatePublicQuoteToken() {
  return randomBytes(24).toString("base64url");
}

export function buildPublicQuoteUrl(baseUrl: string, token: string) {
  const url = new URL(baseUrl);
  url.pathname = `/q/${token}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function renderPublicQuoteEmailHtml({
  quoteHtml,
  quoteUrl,
  businessName,
}: {
  quoteHtml: string;
  quoteUrl: string;
  businessName: string;
}) {
  const safeQuoteUrl = escapeHtml(quoteUrl);
  const safeBusinessName = escapeHtml(businessName);

  return `
    <div style="margin:0;padding:0;background:#11100d;">
      <div style="max-width:760px;margin:0 auto;padding:24px 16px;font-family:Segoe UI,Arial,sans-serif;">
        <div style="margin:0 0 18px;border:1px solid rgba(218,188,145,.22);border-radius:12px;background:#211e18;padding:18px;color:#fff8ee;">
          <p style="margin:0 0 6px;color:#dfad65;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;">Client quote</p>
          <h1 style="margin:0;color:#ffffff;font-size:22px;line-height:1.2;font-weight:900;">${safeBusinessName} sent you a quote</h1>
          <p style="margin:10px 0 0;color:#d4c6b5;font-size:14px;line-height:1.6;">Review the quote details, then approve it online when you are ready to move forward.</p>
          <a href="${safeQuoteUrl}" style="display:inline-block;margin-top:16px;border-radius:10px;background:#f2994a;color:#241205;padding:12px 16px;text-decoration:none;font-size:14px;font-weight:900;">View and approve quote</a>
        </div>
        ${quoteHtml}
        <p style="margin:18px 0 0;text-align:center;color:#958777;font-size:12px;line-height:1.5;">If the button does not open, copy this link: <a href="${safeQuoteUrl}" style="color:#dfad65;">${safeQuoteUrl}</a></p>
      </div>
    </div>
  `;
}

export function canApprovePublicQuoteStatus(status: string) {
  return ["draft", "sent", "approved"].includes(status);
}
