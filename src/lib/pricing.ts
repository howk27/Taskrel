import type { QuoteLineItem, PricingSource, Trade } from "@/types";

export type PricingCatalogMatch = {
  id: string;
  item_name: string;
  description?: string | null;
  unit?: string | null;
  unit_price: number | string;
  item_key?: string | null;
};

export type PricingCatalogUpsert = {
  contractor_id: string;
  trade: Trade;
  item_key: string;
  item_name: string;
  description: string;
  unit: string;
  unit_price: number;
};

const fillerWords = new Set([
  "and",
  "the",
  "for",
  "with",
  "service",
  "services",
  "install",
  "installation",
  "repair",
  "replacement",
]);

function money(value: unknown) {
  const numeric = typeof value === "string" ? Number(value) : typeof value === "number" ? value : 0;
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

function quantity(value: unknown) {
  const numeric = typeof value === "string" ? Number(value) : typeof value === "number" ? value : 0;
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 1000) / 1000;
}

export function normalizePricingKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map(part => part.trim())
    .filter(part => part && !fillerWords.has(part))
    .join(" ");
}

export function calculateQuotePricing({
  line_items,
  tax_rate,
}: {
  line_items: QuoteLineItem[];
  tax_rate?: number | string | null;
}) {
  const normalizedTaxRate = quantity(tax_rate);
  const normalizedItems = line_items.map(item => {
    const normalizedQuantity = quantity(item.quantity);
    const normalizedUnitPrice = money(item.unit_price);
    const total = money(normalizedQuantity * normalizedUnitPrice);
    return {
      ...item,
      quantity: normalizedQuantity,
      unit_price: normalizedUnitPrice,
      total,
    };
  });
  const subtotal = money(normalizedItems.reduce((sum, item) => sum + item.total, 0));
  const tax_amount = money(subtotal * normalizedTaxRate);

  return {
    line_items: normalizedItems,
    subtotal,
    tax_rate: normalizedTaxRate,
    tax_amount,
    total: money(subtotal + tax_amount),
  };
}

export function applyCatalogPricing({
  lineItems,
  catalogItems,
}: {
  trade: Trade;
  lineItems: QuoteLineItem[];
  catalogItems: PricingCatalogMatch[];
}) {
  return lineItems.map(item => {
    const itemKey = normalizePricingKey(item.description);
    const itemUnit = (item.unit ?? "").toLowerCase();
    const match = catalogItems.find(catalogItem => {
      const catalogKey = catalogItem.item_key ?? normalizePricingKey(catalogItem.item_name || catalogItem.description || "");
      const catalogUnit = (catalogItem.unit ?? "").toLowerCase();
      return catalogKey === itemKey && catalogUnit === itemUnit;
    });

    if (!match) {
      return {
        ...item,
        pricing_source: (item.pricing_source ?? "ai_estimate") as PricingSource,
      };
    }

    return {
      ...item,
      catalog_item_id: match.id,
      unit_price: money(match.unit_price),
      pricing_source: "catalog_match" as PricingSource,
    };
  });
}

export function determineQuotePricingSource(lineItems: QuoteLineItem[]): PricingSource {
  const sources = new Set(lineItems.map(item => item.pricing_source ?? "ai_estimate"));
  if (sources.size === 0) return "ai_estimate";
  if (sources.size === 1) return [...sources][0] as PricingSource;
  return "mixed";
}

export function buildCatalogUpserts({
  contractorId,
  trade,
  lineItems,
}: {
  contractorId: string;
  trade: Trade;
  lineItems: QuoteLineItem[];
}): PricingCatalogUpsert[] {
  return lineItems
    .filter(item => item.edited_by_contractor)
    .filter(item => item.description.trim())
    .map(item => ({
      contractor_id: contractorId,
      trade,
      item_key: normalizePricingKey(item.description),
      item_name: item.description.trim(),
      description: item.description.trim(),
      unit: item.unit?.trim() || "unit",
      unit_price: money(item.unit_price),
    }));
}
