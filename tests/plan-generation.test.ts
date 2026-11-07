import { describe, expect, it } from "vitest";
import { generatedPlanSchema } from "../src/lib/ai/schema";
import { templateGenerator } from "../src/lib/ai/template";

const INPUT = {
  training_stage: "in_flight_training",
  language: "en",
  recommendations: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      competency: "workload_management",
      educational_summary: "Educational material on prioritising tasks.",
    },
  ],
};

describe("development plan generation", () => {
  it("builds a valid plan from the template", async () => {
    const plan = generatedPlanSchema.parse(await templateGenerator.generate(INPUT));

    expect(plan.items.map((item) => item.item_type)).toEqual(
      expect.arrayContaining(["objective", "activity", "scenario", "reflection", "follow_up"]),
    );
  });

  it("accepts every competency, including several at once", async () => {
    const competencies = ["stress_management", "decision_making", "human_factors"];
    const input = {
      ...INPUT,
      recommendations: competencies.map((competency, index) => ({
        ...INPUT.recommendations[0],
        id: `11111111-1111-4111-8111-11111111111${index}`,
        competency,
      })),
    };

    expect(generatedPlanSchema.safeParse(await templateGenerator.generate(input)).success).toBe(true);
  });

  it.each([
    "You are fit to fly.",
    "This confirms your fitness to fly.",
    "We diagnose anxiety from your results.",
    "Completing this proves your psychological fitness.",
  ])("rejects the prohibited claim: %s", async (claim) => {
    const plan = (await templateGenerator.generate(INPUT)) as { summary: string };

    expect(generatedPlanSchema.safeParse({ ...plan, summary: claim }).success).toBe(false);
  });
});
