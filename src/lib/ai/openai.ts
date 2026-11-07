import "server-only";
import type { PlanGenerator, PlanInput } from "@/lib/ai/schema";

const SYSTEM_PROMPT = `You create educational development plans for aspiring and student pilots.
Create learning objectives, activities, reflective exercises, one scenario item and a suggested professional follow-up.
Base the plan only on the recommendations provided.
You must never diagnose, assess fitness to fly, predict certification outcomes, or claim that learning activity proves psychological fitness.
Write in the requested language.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "items"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item_type", "title", "description"],
        properties: {
          item_type: { type: "string", enum: ["objective", "activity", "reflection", "scenario", "follow_up"] },
          title: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
};

type ResponsesBody = {
  output?: { content?: { type?: string; text?: string }[] }[];
};

export function createOpenAIGenerator(apiKey: string, model: string): PlanGenerator {
  return {
    model,

    async generate(input: PlanInput) {
      // Recommendation ids stay on the server. They are not needed to write the plan.
      const payload = {
        training_stage: input.training_stage,
        language: input.language,
        recommendations: input.recommendations.map(({ competency, educational_summary }) => ({
          competency,
          educational_summary,
        })),
      };

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          store: false,
          input: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(payload) },
          ],
          text: {
            format: { type: "json_schema", name: "development_plan", strict: true, schema: RESPONSE_SCHEMA },
          },
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) throw new Error(`AI provider returned ${response.status}`);

      const body = (await response.json()) as ResponsesBody;
      const text = body.output
        ?.flatMap((entry) => entry.content ?? [])
        .find((part) => part.type === "output_text")?.text;
      if (!text) throw new Error("AI provider returned no text");

      return JSON.parse(text) as unknown;
    },
  };
}
