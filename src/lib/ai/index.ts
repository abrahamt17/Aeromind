import "server-only";
import { createOpenAIGenerator } from "@/lib/ai/openai";
import type { PlanGenerator } from "@/lib/ai/schema";
import { templateGenerator } from "@/lib/ai/template";

/** The one place that chooses a provider, so it can change without touching the app. */
export function getPlanGenerator(): PlanGenerator {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  return apiKey && model ? createOpenAIGenerator(apiKey, model) : templateGenerator;
}
