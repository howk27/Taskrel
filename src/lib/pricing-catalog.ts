import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuoteLineItem, Trade } from "@/types";
import { buildCatalogUpserts } from "@/lib/pricing";

type PricingCatalogRow = {
  id: string;
  item_name: string;
  description: string | null;
  unit: string | null;
  unit_price: number | string;
  item_key: string | null;
};

export async function fetchPricingCatalog({
  supabase,
  contractorId,
  trade,
}: {
  supabase: SupabaseClient;
  contractorId: string;
  trade: Trade;
}): Promise<PricingCatalogRow[]> {
  const { data } = await supabase
    .from("pricing_catalog_items")
    .select("id, item_name, description, unit, unit_price, item_key")
    .eq("contractor_id", contractorId)
    .eq("trade", trade);

  return data ?? [];
}

export async function learnEditedPrices({
  supabase,
  contractorId,
  trade,
  lineItems,
}: {
  supabase: SupabaseClient;
  contractorId: string;
  trade: Trade;
  lineItems: QuoteLineItem[];
}) {
  const upserts = buildCatalogUpserts({ contractorId, trade, lineItems });

  for (const item of upserts) {
    const { data: existing } = await supabase
      .from("pricing_catalog_items")
      .select("id, usage_count")
      .eq("contractor_id", contractorId)
      .eq("trade", trade)
      .eq("item_key", item.item_key)
      .eq("unit", item.unit)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("pricing_catalog_items")
        .update({
          item_name: item.item_name,
          description: item.description,
          unit_price: item.unit_price,
          usage_count: Number(existing.usage_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("pricing_catalog_items")
        .insert({
          ...item,
          usage_count: 1,
          last_used_at: new Date().toISOString(),
        });
    }
  }
}
