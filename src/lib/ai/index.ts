import "server-only";
import { createAiPlanGenerator } from "@/lib/ai/plan";
import { getAiProvider } from "@/lib/ai/provider";
import type { PlanGenerator } from "@/lib/ai/schema";
import { templateGenerator } from "@/lib/ai/template";

/** Uses the connected AI provider, or labelled pre-written content when there is none. */
export function getPlanGenerator(): PlanGenerator {
  const provider = getAiProvider();
  return provider ? createAiPlanGenerator(provider) : templateGenerator;
}
