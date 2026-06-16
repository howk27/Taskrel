import { describe, expect, it } from "vitest";
import {
  applyCatalogPricing,
  buildCatalogUpserts,
  calculatePricingRecommendation,
  calculateQuotePricing,
  getPropertyValueAdjustment,
  normalizePricingKey,
} from "./pricing";
import type { QuoteLineItem } from "@/types";

describe("pricing engine", () => {
  it("calculates line totals, subtotal, tax, and total from line inputs", () => {
    const result = calculateQuotePricing({
      line_items: [
        { description: "Wall painting", quantity: 2, unit: "room", unit_price: 450, total: 0 },
        { description: "Trim", quantity: 12.5, unit: "lf", unit_price: 8, total: 0 },
      ],
      tax_rate: 0.07,
    });

    expect(result.line_items).toEqual([
      { description: "Wall painting", quantity: 2, unit: "room", unit_price: 450, total: 900 },
      { description: "Trim", quantity: 12.5, unit: "lf", unit_price: 8, total: 100 },
    ]);
    expect(result.subtotal).toBe(1000);
    expect(result.tax_amount).toBe(70);
    expect(result.total).toBe(1070);
  });

  it("treats malformed numeric inputs as zero and rounds money", () => {
    const result = calculateQuotePricing({
      line_items: [
        { description: "Bad quantity", quantity: Number.NaN, unit_price: 100.126, total: 999 } as QuoteLineItem,
        { description: "Bad price", quantity: 3, unit_price: Number.POSITIVE_INFINITY, total: 999 },
      ],
      tax_rate: Number.NaN,
    });

    expect(result.line_items[0].quantity).toBe(0);
    expect(result.line_items[0].unit_price).toBe(100.13);
    expect(result.line_items[0].total).toBe(0);
    expect(result.subtotal).toBe(0);
    expect(result.tax_amount).toBe(0);
    expect(result.total).toBe(0);
  });

  it("uses contractor catalog pricing over AI starter pricing when keys match", () => {
    const result = applyCatalogPricing({
      trade: "painting",
      lineItems: [
        { description: "Interior wall painting", quantity: 3, unit: "room", unit_price: 300, total: 900 },
      ],
      catalogItems: [
        {
          id: "catalog-1",
          item_name: "Interior wall painting",
          description: "Interior wall painting",
          unit: "room",
          unit_price: 425,
        },
      ],
    });

    expect(result[0]).toMatchObject({
      catalog_item_id: "catalog-1",
      unit_price: 425,
      pricing_source: "catalog_match",
    });
  });

  it("builds catalog upserts for contractor-edited line items", () => {
    const upserts = buildCatalogUpserts({
      contractorId: "contractor-1",
      trade: "painting",
      lineItems: [
        {
          description: "Interior wall painting",
          quantity: 2,
          unit: "room",
          unit_price: 500,
          total: 1000,
          edited_by_contractor: true,
        },
        {
          description: "AI untouched",
          quantity: 1,
          unit: "job",
          unit_price: 100,
          total: 100,
          pricing_source: "ai_estimate",
        },
      ],
    });

    expect(upserts).toEqual([
      {
        contractor_id: "contractor-1",
        trade: "painting",
        item_key: normalizePricingKey("Interior wall painting"),
        item_name: "Interior wall painting",
        description: "Interior wall painting",
        unit: "room",
        unit_price: 500,
      },
    ]);
  });

  it("calculates overhead and property value recommendation without changing quote totals", () => {
    const quotePricing = calculateQuotePricing({
      line_items: [
        { description: "Cabinet repaint", quantity: 1, unit: "job", unit_price: 4000, total: 0 },
      ],
      tax_rate: 0.07,
    });

    const recommendation = calculatePricingRecommendation({
      subtotal: quotePricing.subtotal,
      overhead_percent: 10,
      overhead_fixed_per_job: 250,
      estimated_property_value: 1_200_000,
    });

    expect(quotePricing.subtotal).toBe(4000);
    expect(quotePricing.total).toBe(4280);
    expect(recommendation).toMatchObject({
      subtotal: 4000,
      fixed_overhead_cost: 250,
      percent_overhead_cost: 400,
      total_overhead_cost: 650,
      property_value_adjustment_percent: 5,
      property_value_adjustment_amount: 200,
      recommended_subtotal: 4850,
    });
  });

  it("uses Taskrel default property value tiers", () => {
    expect(getPropertyValueAdjustment(250000).percent).toBe(-3);
    expect(getPropertyValueAdjustment(300000).percent).toBe(0);
    expect(getPropertyValueAdjustment(900000).percent).toBe(0);
    expect(getPropertyValueAdjustment(900001).percent).toBe(5);
    expect(getPropertyValueAdjustment(1500000).percent).toBe(5);
    expect(getPropertyValueAdjustment(1500001).percent).toBe(8);
    expect(getPropertyValueAdjustment(null).percent).toBe(0);
  });
});
