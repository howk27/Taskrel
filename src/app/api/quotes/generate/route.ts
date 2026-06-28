import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildQuoteSystemPrompt, buildQuoteUserPrompt } from "@/lib/prompts/quote-prompts";
import { TRADE_LABELS, type Trade } from "@/types";
import { createOpenAIClient, taskrelDefaultModel } from "@/lib/openai";
import { applyCatalogPricing, calculateQuotePricing, determineQuotePricingSource } from "@/lib/pricing";
import { buildPricingRecommendationSnapshot, normalizePropertyValuationSnapshot } from "@/lib/pricing-intelligence";
import { fetchPricingCatalog } from "@/lib/pricing-catalog";

const quoteResponseFormat = {
  type: "json_schema",
  name: "taskrel_quote_draft",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      line_items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string" },
            unit_price: { type: "number" },
            total: { type: "number" },
          },
          required: ["description", "quantity", "unit", "unit_price", "total"],
        },
      },
      subtotal: { type: "number" },
      tax_rate: { type: "number" },
      tax_amount: { type: "number" },
      total: { type: "number" },
      notes: { type: "string" },
      suggested_addons: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            price: { type: "number" },
            reason: { type: "string" },
          },
          required: ["label", "price", "reason"],
        },
      },
      assistant_notes: { type: "array", items: { type: "string" } },
      assumptions: { type: "array", items: { type: "string" } },
      risk_flags: { type: "array", items: { type: "string" } },
      terms_suggestion: { type: "string" },
    },
    required: [
      "line_items",
      "subtotal",
      "tax_rate",
      "tax_amount",
      "total",
      "notes",
      "suggested_addons",
      "assistant_notes",
      "assumptions",
      "risk_flags",
      "terms_suggestion",
    ],
  },
} as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("trade, primary_trade, trades")
    .eq("user_id", user.id)
    .single();

  const trades = (Array.isArray(contractor?.trades) && contractor.trades.length > 0
    ? contractor.trades
    : [contractor?.primary_trade ?? contractor?.trade].filter(Boolean)
  ).filter(isTrade);

  return NextResponse.json({ trades });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractorSelect = "id, trade, primary_trade, trades, overhead_percent, overhead_fixed_per_job";
  const fallbackContractorSelect = "id, trade, primary_trade, trades";
  const { data: contractor, error: contractorError } = await supabase
    .from("contractors")
    .select(contractorSelect)
    .eq("user_id", user.id)
    .single();
  const { data: fallbackContractor } = contractorError?.message.includes("overhead_")
    ? await supabase
      .from("contractors")
      .select(fallbackContractorSelect)
      .eq("user_id", user.id)
      .single()
    : { data: null };
  const quoteContractor = contractor ?? (fallbackContractor ? { ...fallbackContractor, overhead_percent: 0, overhead_fixed_per_job: 0 } : null);

  if (!quoteContractor?.trade && !quoteContractor?.primary_trade) {
    return NextResponse.json({ error: "Service not set" }, { status: 400 });
  }

  const body = await request.json();
  const { jobDescription, additionalDetails } = body;
  const requestedTrade = body.trade as Trade | undefined;
  const availableTrades = Array.isArray(quoteContractor.trades) ? quoteContractor.trades as Trade[] : [];
  const trade = requestedTrade && availableTrades.includes(requestedTrade)
    ? requestedTrade
    : (quoteContractor.primary_trade ?? quoteContractor.trade) as Trade;

  if (!jobDescription?.trim()) {
    return NextResponse.json({ error: "Job description is required" }, { status: 400 });
  }

  const openai = createOpenAIClient();
  if (!openai) {
    return NextResponse.json(
      { error: "AI quote generation is not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const response = await openai.responses.create({
      model: taskrelDefaultModel(),
      instructions: buildQuoteSystemPrompt(trade),
      input: buildQuoteUserPrompt(jobDescription, additionalDetails),
      text: {
        format: quoteResponseFormat,
        verbosity: "low",
      },
      reasoning: { effort: "low" },
    } as never);

    const text = response.output_text ?? "";
    if (!text.trim()) {
      console.error("OpenAI quote generation returned empty output", {
        model: taskrelDefaultModel(),
        responseId: response.id,
        status: response.status,
      });
      return NextResponse.json(
        { error: "AI returned an empty quote draft. Please try again." },
        { status: 502 }
      );
    }

    let quoteData;
    try {
      quoteData = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse OpenAI quote response", {
        model: taskrelDefaultModel(),
        responseId: response.id,
        parseError: err,
        textStart: text.slice(0, 300),
      });
      return NextResponse.json(
        { error: "AI returned a quote draft Taskrel could not read. Please try again." },
        { status: 502 }
      );
    }

    const catalogItems = await fetchPricingCatalog({ supabase, contractorId: quoteContractor.id, trade });
    const pricedLineItems = applyCatalogPricing({
      trade,
      lineItems: Array.isArray(quoteData.line_items) ? quoteData.line_items : [],
      catalogItems,
    });
    const calculated = calculateQuotePricing({
      line_items: pricedLineItems,
      tax_rate: quoteData.tax_rate,
    });
    const propertyValuationSnapshot = normalizePropertyValuationSnapshot(
      body.property_valuation_snapshot,
      body.clientAddress
    );

    return NextResponse.json({
      ...quoteData,
      ...calculated,
      pricing_source: determineQuotePricingSource(calculated.line_items),
      pricing_confidence: catalogItems.length > 0 ? "learned" : "starter",
      property_valuation_snapshot: propertyValuationSnapshot,
      pricing_recommendation_snapshot: buildPricingRecommendationSnapshot({
        subtotal: calculated.subtotal,
        overhead: quoteContractor,
        propertyValuation: propertyValuationSnapshot,
      }),
    });
  } catch (err) {
    console.error("OpenAI quote generation error:", err);
    const openAIError = describeOpenAIError(err);
    return NextResponse.json(
      { error: openAIError.message, code: openAIError.code },
      { status: openAIError.status }
    );
  }
}

function describeOpenAIError(err: unknown): { message: string; code: string; status: number } {
  const error = err as { status?: number; code?: string; message?: string; type?: string };
  const status = Number(error.status ?? 500);
  const rawCode = String(error.code ?? error.type ?? "openai_error");
  const rawMessage = String(error.message ?? "");

  if (status === 401) {
    return {
      status: 503,
      code: "openai_key_rejected",
      message: "OpenAI rejected the API key. Check OPENAI_API_KEY in Vercel and redeploy.",
    };
  }

  if (status === 403) {
    return {
      status: 503,
      code: "openai_access_denied",
      message: "OpenAI denied access to the configured model. Check the project, billing, and model access for this API key.",
    };
  }

  if (status === 404 || rawCode.includes("model") || rawMessage.toLowerCase().includes("model")) {
    return {
      status: 503,
      code: "openai_model_unavailable",
      message: `The configured OpenAI model is unavailable. Set TASKREL_AI_DEFAULT_MODEL to a model your key can use, then redeploy.`,
    };
  }

  if (status === 429 || rawCode.includes("rate_limit") || rawCode.includes("quota")) {
    return {
      status: 503,
      code: "openai_rate_limited",
      message: "OpenAI rate limit or quota was reached. Check usage limits and billing for the OpenAI project.",
    };
  }

  if (status >= 500) {
    return {
      status: 502,
      code: "openai_provider_error",
      message: "OpenAI had a temporary issue generating the quote. Please try again.",
    };
  }

  return {
    status: 500,
    code: "openai_generation_failed",
    message: "AI generation failed. Check Vercel function logs for the OpenAI error details.",
  };
}

function isTrade(value: unknown): value is Trade {
  return typeof value === "string" && value in TRADE_LABELS;
}
