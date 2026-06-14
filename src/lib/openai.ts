import OpenAI from "openai";
import { getConfiguredEnv } from "@/lib/env";

export function createOpenAIClient() {
  const apiKey = getConfiguredEnv("OPENAI_API_KEY");
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export function taskrelDefaultModel() {
  return getConfiguredEnv("TASKREL_AI_DEFAULT_MODEL") ?? "gpt-5.4-mini";
}

export function taskrelComplexModel() {
  return getConfiguredEnv("TASKREL_AI_COMPLEX_MODEL") ?? "gpt-5.5";
}
