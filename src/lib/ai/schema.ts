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

/** Public catalogue entries a plan can link to. They hold no personal data. */
export type PlanOptions = {
  lessons: { id: string; title: string; course_title: string; competencies: string[] }[];
  scenarios: { id: string; title: string; competency: string }[];
};

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
  goals: z
    .array(
      z.object({
        title: safeText(200),
        rationale: safeText(1000),
        activities: z
          .array(
            z.object({
              title: safeText(200),
              type: z.enum(["lesson", "scenario", "reflection"]),
              instructions: safeText(1000),
              estimated_minutes: z.number().int().min(1).max(240),
              linked_title: z.string().max(200).nullable(),
            }),
          )
          .min(1)
          .max(4),
      }),
    )
    .min(1)
    .max(4),
  suggested_follow_up: safeText(1000),
});

export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;

export type PlanItemInput = {
  item_type: "objective" | "activity" | "reflection" | "scenario" | "follow_up";
  title: string;
  description: string;
  lesson_id: string | null;
  scenario_id: string | null;
  estimated_minutes: number | null;
};

/**
 * Turns a validated plan into stored items. Links come only from the supplied
 * options, so the model can never point an activity at anything else.
 */
export function toPlanItems(plan: GeneratedPlan, options: PlanOptions): PlanItemInput[] {
  const items: PlanItemInput[] = plan.goals.flatMap((goal) => [
    {
      item_type: "objective" as const,
      title: goal.title,
      description: goal.rationale,
      lesson_id: null,
      scenario_id: null,
      estimated_minutes: null,
    },
    ...goal.activities.map((activity): PlanItemInput => {
      const base = {
        title: activity.title,
        description: activity.instructions,
        estimated_minutes: activity.estimated_minutes,
      };

      if (activity.type === "lesson") {
        const lesson = options.lessons.find((option) => option.title === activity.linked_title);
        return { ...base, item_type: "activity", lesson_id: lesson?.id ?? null, scenario_id: null };
      }
      if (activity.type === "scenario") {
        const scenario =
          options.scenarios.find((option) => option.title === activity.linked_title) ?? options.scenarios[0];
        return { ...base, item_type: "scenario", lesson_id: null, scenario_id: scenario?.id ?? null };
      }
      return { ...base, item_type: "reflection", lesson_id: null, scenario_id: null };
    }),
  ]);

  items.push({
    item_type: "follow_up",
    title: "Consider a follow-up with your professional",
    description: plan.suggested_follow_up,
    lesson_id: null,
    scenario_id: null,
    estimated_minutes: null,
  });

  return items;
}

export type PlanGenerator = {
  /** Stored on the plan, so the interface can say how it was made. */
  model: string;
  generate(input: PlanInput, options: PlanOptions): Promise<unknown>;
};
