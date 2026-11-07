import { z } from "zod";

const scenarioChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  feedback: z.string().min(1),
  nextStepId: z.string().min(1).nullable(),
});

const scenarioStepSchema = z.object({
  id: z.string().min(1),
  situation: z.string().min(1),
  choices: z.array(scenarioChoiceSchema).min(2),
});

/**
 * Pre-authored, choice-based scenarios stored in learning_scenarios.content.
 * There is no free text and no score: feedback is educational, not an assessment.
 */
export const scenarioContentSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]),
    startStepId: z.string().min(1),
    steps: z.array(scenarioStepSchema).min(1),
    // Added in version 2. Version 1 scenarios keep working without them.
    context: z.string().min(1).optional(),
    reflection: z.string().min(1).optional(),
    references: z.array(z.object({ title: z.string().min(1), url: z.url() })).optional(),
  })
  .superRefine((content, context) => {
    const stepIds = new Set(content.steps.map((step) => step.id));

    if (!stepIds.has(content.startStepId)) {
      context.addIssue({ code: "custom", message: `Unknown start step: ${content.startStepId}` });
    }

    for (const step of content.steps) {
      for (const choice of step.choices) {
        if (choice.nextStepId && !stepIds.has(choice.nextStepId)) {
          context.addIssue({ code: "custom", message: `Unknown next step: ${choice.nextStepId}` });
        }
      }
    }
  });

export type ScenarioContent = z.infer<typeof scenarioContentSchema>;
