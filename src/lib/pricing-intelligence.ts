import { calculatePricingRecommendation } from "@/lib/pricing";
import type { PricingRecommendationSnapshot, PropertyValuationSnapshot } from "@/types";

type OverheadSource = {
  overhead_percent?: number | string | null;
  overhead_fixed_per_job?: number | string | null;
};

function money(value: unknown) {
  const numeric = typeof value === "string" ? Number(value) : typeof value === "number" ? value : null;
  if (!numeric || !Number.isFinite(numeric) || numeric < 0) return null;
  return Math.round(numeric * 100) / 100;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizePropertyValuationSnapshot(
  input: unknown,
  fallbackAddress?: string | null
): PropertyValuationSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const estimatedValue = money(record.estimated_value);
  const address = text(record.address) ?? text(record.normalized_address) ?? text(fallbackAddress);

  if (!estimatedValue && !address) return null;

  return {
    address: address ?? "",
    normalized_address: text(record.normalized_address),
    estimated_value: estimatedValue,
    value_low: money(record.value_low),
    value_high: money(record.value_high),
    confidence: text(record.confidence),
    source: record.source === "rentcast" ? "rentcast" : "manual",
    fetched_at: text(record.fetched_at),
  };
}

export function buildPricingRecommendationSnapshot({
  subtotal,
  overhead,
  propertyValuation,
}: {
  subtotal: number;
  overhead: OverheadSource;
  propertyValuation: PropertyValuationSnapshot | null;
}): PricingRecommendationSnapshot {
  return calculatePricingRecommendation({
    subtotal,
    overhead_percent: overhead.overhead_percent,
    overhead_fixed_per_job: overhead.overhead_fixed_per_job,
    estimated_property_value: propertyValuation?.estimated_value,
  });
}
