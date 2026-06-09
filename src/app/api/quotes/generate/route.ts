import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildQuoteSystemPrompt, buildQuoteUserPrompt } from "@/lib/prompts/quote-prompts";
import type { Trade } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: contractor } = await supabase
    .from("contractors")
    .select("trade")
    .eq("user_id", user.id)
    .single();

  if (!contractor?.trade) {
    return NextResponse.json({ error: "Trade not set" }, { status: 400 });
  }

  const body = await request.json();
  const { jobDescription, additionalDetails } = body;

  if (!jobDescription?.trim()) {
    return NextResponse.json({ error: "Job description is required" }, { status: 400 });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: buildQuoteSystemPrompt(contractor.trade as Trade),
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
