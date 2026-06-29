import { lookup as dnsLookup } from "node:dns/promises";
import puppeteer, { type Browser, type HTTPRequest } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { isBlockedResourceUrlResolved } from "./resource-guard";

/** Resolves a hostname to all of its A/AAAA addresses for SSRF IP checks. */
async function resolveAddresses(hostname: string): Promise<string[]> {
  const records = await dnsLookup(hostname, { all: true });
  return records.map(record => record.address);
}

/**
 * Renders a document HTML fragment (from renderQuoteDocumentHtml or
 * renderInvoiceDocumentHtml) to a print-ready PDF buffer using headless
 * Chromium.
 *
 * Security hardening (security review 2026-06-28):
 * - JavaScript disabled in the page (the document is static HTML+inline CSS).
 * - Request interception: only the main document and https images to public
 *   hosts are allowed; everything else (file:, http:, private IPs, scripts,
 *   xhr, …) is aborted. See resource-guard.ts.
 * - Hard timeout bounds setContent + pdf so a hung/slow resource cannot pin a
 *   serverless function open.
 *
 * Configuration:
 * - Serverless: set CHROMIUM_PACK_URL to the @sparticuz/chromium pack tarball
 *   that matches the installed @sparticuz/chromium-min version.
 * - Local/other host: set PUPPETEER_EXECUTABLE_PATH to a Chrome/Chromium binary.
 */

const RENDER_TIMEOUT_MS = 12_000;

// US Letter at 96dpi ≈ 816×1056; render at 2x for crisp text.
const VIEWPORT = { width: 816, height: 1056, deviceScaleFactor: 2 };
const HARDENING_ARGS = ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"];

async function launchBrowser(): Promise<Browser> {
  const packUrl = process.env.CHROMIUM_PACK_URL;
  if (packUrl) {
    return puppeteer.launch({
      args: [...chromium.args, ...HARDENING_ARGS],
      defaultViewport: VIEWPORT,
      executablePath: await chromium.executablePath(packUrl),
      headless: true,
    });
  }

  const localExecutable = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (localExecutable) {
    return puppeteer.launch({
      args: HARDENING_ARGS,
      defaultViewport: VIEWPORT,
      executablePath: localExecutable,
      headless: true,
    });
  }

  throw new Error(
    "PDF rendering is not configured: set CHROMIUM_PACK_URL (serverless) or PUPPETEER_EXECUTABLE_PATH (local).",
  );
}

/** Wraps the document fragment in a minimal print shell. */
function buildPrintHtml(documentHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<style>@page{size:Letter;margin:11mm}` +
    `html,body{margin:0;padding:0;background:#ffffff;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
    // The document is a card (padding/border/radius) on the web approval page.
    // For print the @page margin is the frame, so strip the card chrome and let
    // the sheet use the full content width — keeps a typical quote to one page.
    `body>div{max-width:none!important;padding:0!important;border:0!important;border-radius:0!important}` +
    `.quote-line-row,.quote-document-summary{break-inside:avoid}` +
    `</style></head><body>${documentHtml}</body></html>`;
}

export async function renderDocumentPdf(documentHtml: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request: HTTPRequest) => {
      if (request.isInterceptResolutionHandled()) return;
      const type = request.resourceType();
      if (type === "document") {
        void request.continue().catch(() => {});
        return;
      }
      if (type !== "image") {
        void request.abort().catch(() => {});
        return;
      }
      // Images: resolve the host and block any private/loopback/metadata IP
      // (DNS-rebinding safe). Resolution failure fails closed (abort).
      void (async () => {
        const blocked = await isBlockedResourceUrlResolved(request.url(), resolveAddresses);
        if (request.isInterceptResolutionHandled()) return;
        await (blocked ? request.abort() : request.continue()).catch(() => {});
      })();
    });

    // "load" waits for the (request-filtered) images; the hard timeout bounds
    // it so a slow allowed resource cannot pin the function open.
    await page.setContent(buildPrintHtml(documentHtml), {
      waitUntil: "load",
      timeout: RENDER_TIMEOUT_MS,
    });

    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      preferCSSPageSize: true,
      timeout: RENDER_TIMEOUT_MS,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
