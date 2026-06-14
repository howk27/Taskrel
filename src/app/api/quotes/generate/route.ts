import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildQuoteSystemPrompt, buildQuoteUserPrompt } from "@/lib/prompts/quote-prompts";
import type { Trade } from "@/types";
import { createOpenAIClient, taskrelDefaultModel } from "@/lib/openai";

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
        format: { type: "json_object" },
        verbosity: "low",
      },
      reasoning: { effort: "low" },
    } as never);

    const text = response.output_text ?? "";

    let quoteData;
    try {
      quoteData = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json(quoteData);
  } catch (err) {
    console.error("OpenAI quote generation error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
