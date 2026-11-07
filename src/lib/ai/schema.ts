import { z } from "zod";

/** Exactly what get_plan_generation_input returns. Nothing else reaches the AI. */
export const planInputSchema = z.object({
  training_stage: z.string().nullable(),
  language: z.string(),
  recommendations: z
    .array(
      z.object({
        id: z.uuid(),
        competency: z.string(),
        educational_summary: z.string(),
      }),
    )
    .min(1),
});

export type PlanInput = z.infer<typeof planInputSchema>;

const PROHIBITED_CLAIMS = /fit(ness)? to fly|diagnos|certif(y|ied|ication) outcome|proves? (your )?(psychological|mental)/i;

const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((text) => !PROHIBITED_CLAIMS.test(text), "Contains a prohibited claim");

export const generatedPlanSchema = z.object({
  title: safeText(200),
  summary: safeText(2000),
  items: z
    .array(
      z.object({
        item_type: z.enum(["objective", "activity", "reflection", "scenario", "follow_up"]),
        title: safeText(200),
        description: safeText(2000),
      }),
    )
    .min(3)
    .max(10),
});

export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;

export type PlanGenerator = {
  /** Stored on the plan, so the interface can say how it was made. */
  model: string;
  generate(input: PlanInput): Promise<unknown>;
};
