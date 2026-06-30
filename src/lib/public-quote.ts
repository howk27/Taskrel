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
    <div style="margin:0;padding:0;background:#08111f;">
      <div style="max-width:760px;margin:0 auto;padding:24px 16px;font-family:Aptos,Arial,sans-serif;">
        <div style="margin:0 0 18px;border:1px solid rgba(148,163,184,.24);border-radius:8px;background:#0d1726;padding:18px;color:#f8fafc;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;line-height:1.2;font-weight:800;">${safeBusinessName} sent you a quote</h1>
          <p style="margin:10px 0 0;color:#cbd5e1;font-size:14px;line-height:1.6;">Review the quote details, then approve it online when you are ready to move forward.</p>
          <a href="${safeQuoteUrl}" style="display:inline-block;margin-top:16px;border-radius:8px;background:#fb923c;color:#08111f;padding:12px 16px;text-decoration:none;font-size:14px;font-weight:800;">View and approve quote</a>
        </div>
        ${quoteHtml}
        <p style="margin:18px 0 0;text-align:center;color:#94a3b8;font-size:13px;line-height:1.5;">If the button does not open, copy this link: <a href="${safeQuoteUrl}" style="color:#fb923c;">${safeQuoteUrl}</a></p>
      </div>
    </div>
  `;
}

export function canApprovePublicQuoteStatus(status: string) {
  return ["draft", "sent", "approved"].includes(status);
}

export function renderApprovalNotificationHtml({
  clientName,
  quoteUrl,
}: {
  clientName: string;
  quoteUrl: string;
}) {
  const safeName = escapeHtml(clientName);
  const safeUrl = escapeHtml(quoteUrl);
  return `
    <div style="margin:0;padding:0;background:#08111f;">
      <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Aptos,Arial,sans-serif;">
        <div style="border:1px solid rgba(148,163,184,.24);border-radius:8px;background:#0d1726;padding:18px;color:#f8fafc;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;line-height:1.2;font-weight:800;">Quote approved</h1>
          <p style="margin:10px 0 0;color:#cbd5e1;font-size:14px;line-height:1.6;">${safeName} approved your quote and is ready to move forward.</p>
          <a href="${safeUrl}" style="display:inline-block;margin-top:16px;border-radius:8px;background:#fb923c;color:#08111f;padding:12px 16px;text-decoration:none;font-size:14px;font-weight:800;">View quote</a>
        </div>
        <p style="margin:18px 0 0;text-align:center;color:#94a3b8;font-size:13px;">If the button does not open, copy this link: <a href="${safeUrl}" style="color:#fb923c;">${safeUrl}</a></p>
      </div>
    </div>
  `;
}

export function renderResendRequestHtml({
  clientName,
  clientAddress,
  quoteUrl,
}: {
  clientName: string;
  clientAddress: string | null;
  quoteUrl: string;
}) {
  const safeName = escapeHtml(clientName);
  const safeUrl = escapeHtml(quoteUrl);
  const addressLine = clientAddress
    ? `<p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">${escapeHtml(clientAddress)}</p>`
    : "";
  return `
    <div style="margin:0;padding:0;background:#08111f;">
      <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Aptos,Arial,sans-serif;">
        <div style="border:1px solid rgba(148,163,184,.24);border-radius:8px;background:#0d1726;padding:18px;color:#f8fafc;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;line-height:1.2;font-weight:800;">Resend requested</h1>
          <p style="margin:10px 0 0;color:#cbd5e1;font-size:14px;line-height:1.6;">${safeName} is requesting a new quote — their previous one has expired.</p>
          ${addressLine}
          <a href="${safeUrl}" style="display:inline-block;margin-top:16px;border-radius:8px;background:#fb923c;color:#08111f;padding:12px 16px;text-decoration:none;font-size:14px;font-weight:800;">View quote</a>
        </div>
        <p style="margin:18px 0 0;text-align:center;color:#94a3b8;font-size:13px;">If the button does not open, copy this link: <a href="${safeUrl}" style="color:#fb923c;">${safeUrl}</a></p>
      </div>
    </div>
  `;
}
