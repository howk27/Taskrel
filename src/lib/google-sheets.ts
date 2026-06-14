import { getConfiguredEnv, getMissingEnv } from "@/lib/env";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface SpreadsheetResponse {
  spreadsheetId?: string;
  error?: {
    message?: string;
  };
}

export function getGoogleSheetsMissingEnv() {
  return getMissingEnv(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXT_PUBLIC_APP_URL"]);
}

export function getGoogleSheetsRedirectUri() {
  return `${getConfiguredEnv("NEXT_PUBLIC_APP_URL")}/api/google-sheets/callback`;
}

export function buildGoogleSheetsAuthUrl(state: string) {
  const clientId = getConfiguredEnv("GOOGLE_CLIENT_ID");
  const redirectUri = getGoogleSheetsRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SHEETS_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getConfiguredEnv("GOOGLE_CLIENT_ID") ?? "",
      client_secret: getConfiguredEnv("GOOGLE_CLIENT_SECRET") ?? "",
      redirect_uri: getGoogleSheetsRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  return response.json();
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getConfiguredEnv("GOOGLE_CLIENT_ID") ?? "",
      client_secret: getConfiguredEnv("GOOGLE_CLIENT_SECRET") ?? "",
      grant_type: "refresh_token",
    }),
  });

  return response.json();
}

export async function createTaskrelSpreadsheet(accessToken: string, businessName: string) {
  const response = await fetch(SHEETS_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: `Taskrel Export - ${businessName || "Contractor"}` },
      sheets: [{ properties: { title: "Taskrel" } }],
    }),
  });

  const data = (await response.json()) as SpreadsheetResponse;
  if (!response.ok || !data.spreadsheetId) {
    throw new Error(data.error?.message ?? "Failed to create Google Sheet.");
  }

  return data.spreadsheetId;
}

export async function syncRowsToGoogleSheet(accessToken: string, spreadsheetId: string, rows: string[][]) {
  const range = encodeURIComponent("Taskrel!A1");
  const response = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message ?? "Failed to sync Google Sheet.");
  }
}
