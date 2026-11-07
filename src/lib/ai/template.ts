import type { PlanGenerator, PlanInput } from "@/lib/ai/schema";
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

  async generate(input: PlanInput) {
    const topics = input.recommendations.slice(0, 3);
    const names = topics.map((topic) => labelFor(topic.competency).toLowerCase());

    return {
      title: `Development plan: ${labelFor(topics[0].competency).toLowerCase()}`,
      summary: `Educational activities on ${names.join(" and ")}, based on recommendations your professional approved for this purpose.`,
      items: [
        ...topics.flatMap((topic) => [
          {
            item_type: "objective",
            title: `Build your understanding of ${labelFor(topic.competency).toLowerCase()}`,
            description: topic.educational_summary,
          },
          {
            item_type: "activity",
            title: `Practise ${labelFor(topic.competency).toLowerCase()}`,
            description: activityFor(topic.competency),
          },
        ]),
        {
          item_type: "scenario",
          title: "Work through an aviation scenario",
          description: "Make decisions in an illustrative flight-training situation and read the feedback.",
        },
        {
          item_type: "reflection",
          title: "Reflect on what you have learned",
          description: "Note one habit you want to keep and one you want to change on your next flight.",
        },
        {
          item_type: "follow_up",
          title: "Consider a follow-up with your professional",
          description: "Talk through what you have learned and whether anything else would help.",
        },
      ],
    };
  },
};
