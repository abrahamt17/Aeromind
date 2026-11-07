import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { buildPlanPayload, createAiPlanGenerator } from "../src/lib/ai/plan";
import type { AiProvider } from "../src/lib/ai/provider";
import { generatedPlanSchema, toPlanItems } from "../src/lib/ai/schema";
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

vi.mock("server-only", () => ({}));

const OPTIONS = {
  lessons: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Workload and busy phases of flight",
      course_title: "Stress Management in Aviation",
      competencies: ["workload_management"],
    },
  ],
  scenarios: [
    { id: "33333333-3333-4333-8333-333333333333", title: "Busy circuit", competency: "workload_management" },
  ],
};

const AI_PLAN = {
  title: "Prioritising under workload",
  summary: "Educational activities on task order.",
  goals: [
    {
      title: "Plan ahead for busy phases",
      rationale: "Your professional approved this topic.",
      activities: [
        {
          title: "Read the workload lesson",
          type: "lesson",
          instructions: "Read it and note one idea.",
          estimated_minutes: 12,
          linked_title: "Workload and busy phases of flight",
        },
        {
          title: "Try the simulation",
          type: "scenario",
          instructions: "Work through the educational simulation.",
          estimated_minutes: 10,
          linked_title: "Busy circuit",
        },
        {
          title: "Reflect",
          type: "reflection",
          instructions: "Write down one habit.",
          estimated_minutes: 5,
          linked_title: null,
        },
      ],
    },
  ],
  suggested_follow_up: "Discuss your progress with your professional.",
};

describe("development plan generation", () => {
  it("builds a valid plan from the template", async () => {
    const plan = generatedPlanSchema.parse(await templateGenerator.generate(INPUT, OPTIONS));
    const items = toPlanItems(plan, OPTIONS);

    expect(items.map((item) => item.item_type)).toEqual(
      expect.arrayContaining(["objective", "activity", "scenario", "reflection", "follow_up"]),
    );
    expect(items.some((item) => item.lesson_id === OPTIONS.lessons[0].id)).toBe(true);
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

    expect(generatedPlanSchema.safeParse(await templateGenerator.generate(input, OPTIONS)).success).toBe(true);
  });

  it.each([
    "You are fit to fly.",
    "This confirms your fitness to fly.",
    "We diagnose anxiety from your results.",
    "Completing this proves your psychological fitness.",
  ])("rejects the prohibited claim: %s", async (claim) => {
    const plan = (await templateGenerator.generate(INPUT, OPTIONS)) as { summary: string };

    expect(generatedPlanSchema.safeParse({ ...plan, summary: claim }).success).toBe(false);
  });

  it("links activities only to supplied options", () => {
    const plan = generatedPlanSchema.parse(AI_PLAN);
    const items = toPlanItems(plan, OPTIONS);

    expect(items.find((item) => item.lesson_id)?.lesson_id).toBe(OPTIONS.lessons[0].id);
    expect(items.find((item) => item.scenario_id)?.scenario_id).toBe(OPTIONS.scenarios[0].id);
    expect(items.at(-1)?.item_type).toBe("follow_up");
  });

  it("drops a lesson link the model invented", () => {
    const invented = structuredClone(AI_PLAN);
    invented.goals[0].activities[0].linked_title = "A lesson that does not exist";

    const items = toPlanItems(generatedPlanSchema.parse(invented), OPTIONS);

    expect(items.every((item) => item.lesson_id === null)).toBe(true);
  });

  it("rejects a prohibited claim anywhere in a nested plan", () => {
    const unsafe = structuredClone(AI_PLAN);
    unsafe.goals[0].activities[2].instructions = "This shows you are fit to fly.";

    expect(generatedPlanSchema.safeParse(unsafe).success).toBe(false);
  });

  it("sends only approved educational text, and no ids or personal data", async () => {
    const input = {
      ...INPUT,
      name: "Sample Trainee",
      email: "trainee@example.com",
      responses: { answer: "private questionnaire answer" },
      notes: "private note",
    };
    const generateJson = vi.fn(async () => AI_PLAN);
    const provider: AiProvider = {
      name: "test",
      chatModel: "test-model",
      embeddingModel: "test-embedding",
      generateJson,
      embed: async () => [],
    };

    await createAiPlanGenerator(provider).generate(input, OPTIONS);

    const sent = (generateJson.mock.calls[0] as unknown as [{ user: string }])[0].user;
    expect(JSON.parse(sent)).toEqual(buildPlanPayload(INPUT, OPTIONS));
    for (const forbidden of [
      "Sample Trainee",
      "trainee@example.com",
      "private questionnaire answer",
      "private note",
      INPUT.recommendations[0].id,
      OPTIONS.lessons[0].id,
      OPTIONS.scenarios[0].id,
    ]) {
      expect(sent).not.toContain(forbidden);
    }
  });
});
