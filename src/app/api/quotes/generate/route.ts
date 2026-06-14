import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildQuoteSystemPrompt, buildQuoteUserPrompt } from "@/lib/prompts/quote-prompts";
import type { Trade } from "@/types";
import { getConfiguredEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("trade, primary_trade, trades")
    .eq("user_id", user.id)
    .single();

  if (!contractor?.trade && !contractor?.primary_trade) {
    return NextResponse.json({ error: "Trade not set" }, { status: 400 });
  }

  const body = await request.json();
  const { jobDescription, additionalDetails } = body;
  const requestedTrade = body.trade as Trade | undefined;
  const availableTrades = Array.isArray(contractor.trades) ? contractor.trades as Trade[] : [];
  const trade = requestedTrade && availableTrades.includes(requestedTrade)
    ? requestedTrade
    : (contractor.primary_trade ?? contractor.trade) as Trade;

  if (!jobDescription?.trim()) {
    return NextResponse.json({ error: "Job description is required" }, { status: 400 });
  }

  const apiKey = getConfiguredEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI quote generation is not configured. Set ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: buildQuoteSystemPrompt(trade),
      messages: [
        {
          role: "user",
          content: buildQuoteUserPrompt(jobDescription, additionalDetails),
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    let quoteData;
    try {
      quoteData = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json(quoteData);
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
