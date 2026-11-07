import type { PlanGenerator, PlanInput, PlanOptions } from "@/lib/ai/schema";
import { COMPETENCIES, type Competency } from "@/lib/labels";

export const TEMPLATE_MODEL = "template-v1";

const ACTIVITIES: Record<Competency, string> = {
  stress_management:
    "Learn a short breathing and reset routine, then practise it before your next briefing.",
  decision_making:
    "Study a simple decision model and apply it to a past training flight, step by step.",
  attention_management:
    "Review how attention narrows under load and note the cues that help you widen your scan.",
  situational_awareness:
    "Practise describing what is happening now, what it means and what is likely to happen next.",
  emotional_regulation:
    "Learn to name a difficult emotion early and choose one action that helps you refocus.",
  communication_teamwork:
    "Practise clear, concise requests and read-backs with a training partner or instructor.",
  workload_management:
    "Map the busiest phases of a training flight and decide in advance what comes first.",
  human_factors:
    "Review a published human-factors case study and note what could have changed the outcome.",
};

function labelFor(competency: string): string {
  return COMPETENCIES[competency as Competency] ?? "Human performance";
}

function activityFor(competency: string): string {
  return ACTIVITIES[competency as Competency] ?? ACTIVITIES.human_factors;
}

/**
 * Builds a plan from pre-written educational content when no AI provider is
 * connected. Plans it creates are labelled, so they are never presented as AI output.
 */
export const templateGenerator: PlanGenerator = {
  model: TEMPLATE_MODEL,

  async generate(input: PlanInput, options: PlanOptions) {
    const topics = input.recommendations.slice(0, 3);
    const names = topics.map((topic) => labelFor(topic.competency).toLowerCase());

    return {
      title: `Development plan: ${labelFor(topics[0].competency).toLowerCase()}`,
      summary: `Educational activities on ${names.join(" and ")}, based on recommendations your professional approved for this purpose.`,
      goals: [
        ...topics.map((topic) => {
          const lesson = options.lessons.find((option) => option.competencies.includes(topic.competency));
          return {
            title: `Build your understanding of ${labelFor(topic.competency).toLowerCase()}`,
            rationale: topic.educational_summary,
            activities: [
              {
                title: `Practise ${labelFor(topic.competency).toLowerCase()}`,
                type: "lesson" as const,
                instructions: activityFor(topic.competency),
                estimated_minutes: 15,
                linked_title: lesson?.title ?? null,
              },
            ],
          };
        }),
        {
          title: "Apply what you have learned",
          rationale: "Practising in a hypothetical situation helps you connect ideas to training.",
          activities: [
            {
              title: "Work through an aviation scenario",
              type: "scenario" as const,
              instructions: "Make decisions in an educational simulation and read the feedback.",
              estimated_minutes: 10,
              linked_title: options.scenarios[0]?.title ?? null,
            },
            {
              title: "Reflect on what you have learned",
              type: "reflection" as const,
              instructions: "Note one habit you want to keep and one you want to change on your next flight.",
              estimated_minutes: 10,
              linked_title: null,
            },
          ],
        },
      ].slice(0, 4),
      suggested_follow_up: "Talk through what you have learned with your professional, and whether anything else would help.",
    };
  },
};
