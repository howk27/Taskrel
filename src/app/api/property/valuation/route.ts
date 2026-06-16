import { NextResponse } from "next/server";
import { getConfiguredEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type RentCastValueResponse = Record<string, unknown>;

function numeric(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : null;
  return parsed && Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nestedText(data: RentCastValueResponse, keys: string[]) {
  for (const key of keys) {
    const value = key.split(".").reduce<unknown>((current, part) => {
      if (!current || typeof current !== "object") return null;
      return (current as Record<string, unknown>)[part];
    }, data);
    const result = text(value);
    if (result) return result;
  }
  return null;
}

function normalizeRentCastValue(data: RentCastValueResponse, fallbackAddress: string) {
  const estimatedValue =
    numeric(data.price) ??
    numeric(data.value) ??
    numeric(data.estimate) ??
    numeric(data.estimatedValue) ??
    numeric(data.priceEstimate);
  const valueLow =
    numeric(data.priceRangeLow) ??
    numeric(data.valueRangeLow) ??
    numeric(data.estimateLow) ??
    numeric(data.low);
  const valueHigh =
    numeric(data.priceRangeHigh) ??
    numeric(data.valueRangeHigh) ??
    numeric(data.estimateHigh) ??
    numeric(data.high);
  const normalizedAddress =
    nestedText(data, [
      "formattedAddress",
      "address",
      "subjectProperty.formattedAddress",
      "subjectProperty.address",
    ]) ?? fallbackAddress;

  return {
    address: fallbackAddress,
    normalized_address: normalizedAddress,
    estimated_value: estimatedValue,
    value_low: valueLow,
    value_high: valueHigh,
    confidence: text(data.confidence) ?? text(data.confidenceScore),
    source: "rentcast" as const,
    fetched_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { address } = await request.json().catch(() => ({ address: "" }));
  const normalizedAddress = String(address ?? "").trim();
  if (!normalizedAddress) {
    return NextResponse.json({ error: "Address is required." }, { status: 400 });
  }

  const apiKey = getConfiguredEnv("RENTCAST_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { error: "RentCast is not configured. Enter property value manually.", code: "rentcast_not_configured" },
      { status: 503 }
    );
  }

  const url = new URL("https://api.rentcast.io/v1/avm/value");
  url.searchParams.set("address", normalizedAddress);
  url.searchParams.set("lookupSubjectAttributes", "true");
  url.searchParams.set("compCount", "5");

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "X-Api-Key": apiKey,
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("RentCast valuation error:", { status: response.status, data });
      return NextResponse.json(
        { error: "RentCast could not verify this property value. Enter it manually.", code: "rentcast_lookup_failed" },
        { status: 502 }
      );
    }

    const valuation = normalizeRentCastValue(data, normalizedAddress);
    if (!valuation.estimated_value) {
      return NextResponse.json(
        { error: "RentCast did not return a property value estimate. Enter it manually.", code: "rentcast_no_value" },
        { status: 502 }
      );
    }

    return NextResponse.json(valuation);
  } catch (err) {
    console.error("RentCast valuation request failed:", err);
    return NextResponse.json(
      { error: "RentCast lookup failed. Enter property value manually.", code: "rentcast_request_failed" },
      { status: 502 }
    );
  }
}
