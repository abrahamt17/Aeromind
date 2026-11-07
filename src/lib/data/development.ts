import "server-only";
import type { Recommendation } from "@/lib/data/assessments";
import { asUser } from "@/lib/db";
import type { PlanItemType } from "@/lib/labels";
import { scenarioContentSchema, type ScenarioContent } from "@/lib/schemas/scenario";

export type PlanItem = {
  id: string;
  position: number;
  item_type: PlanItemType;
  title: string;
  description: string;
  scenario_id: string | null;
  completed_at: Date | null;
};

export type Plan = {
  id: string;
  title: string;
  summary: string;
  model: string | null;
  is_sample: boolean;
  created_at: Date;
  items: PlanItem[];
};

export type DevelopmentEntry = {
  request_id: string;
  professional_id: string;
  professional_name: string;
  approved_recommendations: Recommendation[];
  has_ai_consent: boolean;
  plan: Plan | null;
};

/** One entry for each assessment whose report has been released. */
export async function getDevelopment(userId: string): Promise<DevelopmentEntry[]> {
  return asUser(userId, async (tx) => {
    const requests = await tx.rows<{
      id: string;
      professional_id: string;
      professional_name: string;
    }>(
      `select r.id, p.user_id as professional_id, p.display_name as professional_name
       from public.assessment_requests r
       join public.psychologist_profiles p on p.user_id = r.psychologist_id
       where r.trainee_id = $1 and r.status = 'report_released'
       order by r.created_at desc`,
      [userId],
    );

    const entries: DevelopmentEntry[] = [];
    for (const request of requests) {
      const approved = await tx.rows<Recommendation>(
        `select id, competency, recommendation_text, educational_summary, approved_for_ai
         from public.professional_recommendations
         where assessment_request_id = $1 and approved_for_ai
         order by created_at`,
        [request.id],
      );
      const consent = await tx.one(
        `select 1 from public.consents
         where assessment_request_id = $1 and purpose = 'ai_development_plan' and withdrawn_at is null`,
        [request.id],
      );
      const plan = await tx.one<Omit<Plan, "items">>(
        `select id, title, summary, model, is_sample, created_at
         from public.development_plans where assessment_request_id = $1`,
        [request.id],
      );
      const items = plan
        ? await tx.rows<PlanItem>(
            `select id, position, item_type, title, description, scenario_id, completed_at
             from public.development_plan_items where plan_id = $1 order by position`,
            [plan.id],
          )
        : [];

      entries.push({
        request_id: request.id,
        professional_id: request.professional_id,
        professional_name: request.professional_name,
        approved_recommendations: approved,
        has_ai_consent: Boolean(consent),
        plan: plan ? { ...plan, items } : null,
      });
    }

    return entries;
  });
}

export type Scenario = {
  id: string;
  title: string;
  summary: string;
  content: ScenarioContent;
  plan_item_id: string | null;
  last_completed_at: Date | null;
};

/** `planItemId` is the plan item that opened the scenario. RLS limits it to the trainee's own plans. */
export async function getScenario(
  userId: string,
  scenarioId: string,
  planItemId: string | null,
): Promise<Scenario | null> {
  return asUser(userId, async (tx) => {
    const scenario = await tx.one<{ id: string; title: string; summary: string; content: unknown }>(
      "select id, title, summary, content from public.learning_scenarios where id = $1 and published",
      [scenarioId],
    );
    if (!scenario) return null;

    const planItem = planItemId
      ? await tx.one<{ id: string }>(
          "select id from public.development_plan_items where id = $1 and scenario_id = $2",
          [planItemId, scenarioId],
        )
      : null;
    const attempt = await tx.one<{ completed_at: Date }>(
      `select completed_at from public.scenario_attempts
       where scenario_id = $1 and trainee_id = $2 and completed_at is not null
       order by completed_at desc limit 1`,
      [scenarioId, userId],
    );

    return {
      id: scenario.id,
      title: scenario.title,
      summary: scenario.summary,
      content: scenarioContentSchema.parse(scenario.content),
      plan_item_id: planItem?.id ?? null,
      last_completed_at: attempt?.completed_at ?? null,
    };
  });
}
