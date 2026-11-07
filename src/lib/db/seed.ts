import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/db/passwords";
import {
  DEMO_PLAN,
  DEMO_POLICY_VERSION,
  DEMO_PSYCHOLOGIST_EMAIL,
  DEMO_QUESTIONNAIRE_VERSION,
  DEMO_RECOMMENDATION,
  DEMO_REPORT,
  DEMO_RESPONSES,
  DEMO_TRAINEE,
  SAMPLE_PROFESSIONALS,
  WORKLOAD_SCENARIO,
} from "@/lib/demo/data";
import { scenarioContentSchema } from "@/lib/schemas/scenario";

export type SeedDatabase = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

export type DemoUser = {
  email: string;
  role: "trainee" | "psychologist";
  displayName: string;
};

/** Creates a demo account and returns its id. Hosted projects pass their own version. */
export type CreateDemoUser = (user: DemoUser) => Promise<string>;

function createLocalUser(db: SeedDatabase): CreateDemoUser {
  return async ({ email, role, displayName }) => {
    // Demo accounts are entered through the one-click buttons, so passwords are random.
    const password = randomBytes(32).toString("base64url");
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (email, password_hash, raw_user_meta_data)
       values ($1, $2, $3) returning id`,
      [email, hashPassword(password), JSON.stringify({ role, display_name: displayName })],
    );
    return rows[0].id;
  };
}

/**
 * Loads synthetic data. It runs with full access and must only ever run on an
 * empty database.
 */
export async function seedDemoData(
  pg: SeedDatabase,
  createUser: CreateDemoUser = createLocalUser(pg),
): Promise<void> {
  let psychologistId = "";

  for (const professional of SAMPLE_PROFESSIONALS) {
    const id = await createUser({
      email: professional.email,
      role: "psychologist",
      displayName: professional.displayName,
    });
    if (professional.email === DEMO_PSYCHOLOGIST_EMAIL) psychologistId = id;

    await pg.query(
      `update public.psychologist_profiles set
         headline = $2, bio = $3, qualifications = $4, specialties = $5, languages = $6,
         consultation_formats = $7, country = $8, years_experience = $9,
         accepting_requests = $10, published = true, is_sample = true,
         verification_status = 'demo_verified', onboarding_completed_at = now()
       where user_id = $1`,
      [
        id,
        professional.headline,
        professional.bio,
        professional.qualifications,
        professional.specialties,
        professional.languages,
        professional.consultationFormats,
        professional.country,
        professional.yearsExperience,
        professional.acceptingRequests,
      ],
    );
  }

  const traineeId = await createUser({
    email: DEMO_TRAINEE.email,
    role: "trainee",
    displayName: DEMO_TRAINEE.displayName,
  });
  await pg.query(
    `update public.trainee_profiles
     set training_stage = 'in_flight_training', country = 'Germany', onboarding_completed_at = now()
     where user_id = $1`,
    [traineeId],
  );

  const { rows: scenarios } = await pg.query<{ id: string }>(
    `insert into public.learning_scenarios (slug, title, summary, competency, content, published)
     values ($1, $2, $3, 'workload_management', $4, true) returning id`,
    [
      WORKLOAD_SCENARIO.slug,
      WORKLOAD_SCENARIO.title,
      WORKLOAD_SCENARIO.summary,
      JSON.stringify(scenarioContentSchema.parse(WORKLOAD_SCENARIO.content)),
    ],
  );
  const scenarioId = scenarios[0].id;

  const { rows: requests } = await pg.query<{ id: string }>(
    `insert into public.assessment_requests (trainee_id, psychologist_id, status, trainee_message)
     values ($1, $2, 'report_released', 'Sample request: I would like support with managing workload.')
     returning id`,
    [traineeId, psychologistId],
  );
  const requestId = requests[0].id;

  for (const purpose of ["questionnaire_processing", "ai_development_plan"]) {
    await pg.query(
      `insert into public.consents (trainee_id, assessment_request_id, purpose, policy_version)
       values ($1, $2, $3, $4)`,
      [traineeId, requestId, purpose, DEMO_POLICY_VERSION],
    );
  }

  await pg.query(
    `insert into public.demo_questionnaire_submissions
       (assessment_request_id, trainee_id, questionnaire_version, responses)
     values ($1, $2, $3, $4)`,
    [requestId, traineeId, DEMO_QUESTIONNAIRE_VERSION, JSON.stringify(DEMO_RESPONSES)],
  );

  const { rows: recommendations } = await pg.query<{ id: string }>(
    `insert into public.professional_recommendations
       (assessment_request_id, competency, recommendation_text, educational_summary,
        approved_for_ai, approved_by, approved_at)
     values ($1, $2, $3, $4, true, $5, now()) returning id`,
    [
      requestId,
      DEMO_RECOMMENDATION.competency,
      DEMO_RECOMMENDATION.recommendationText,
      DEMO_RECOMMENDATION.educationalSummary,
      psychologistId,
    ],
  );

  await pg.query(
    `insert into public.professional_reports (assessment_request_id, title, body, released_at)
     values ($1, $2, $3, now())`,
    [requestId, DEMO_REPORT.title, DEMO_REPORT.body],
  );

  const { rows: plans } = await pg.query<{ id: string }>(
    `insert into public.development_plans
       (assessment_request_id, trainee_id, title, summary, model, is_sample)
     values ($1, $2, $3, $4, 'pre-generated-sample', true) returning id`,
    [requestId, traineeId, DEMO_PLAN.title, DEMO_PLAN.summary],
  );
  const planId = plans[0].id;

  await pg.query(
    `insert into public.development_plan_sources (plan_id, recommendation_id) values ($1, $2)`,
    [planId, recommendations[0].id],
  );

  for (const [position, item] of DEMO_PLAN.items.entries()) {
    await pg.query(
      `insert into public.development_plan_items
         (plan_id, position, item_type, title, description, scenario_id)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        planId,
        position,
        item.itemType,
        item.title,
        item.description,
        item.itemType === "scenario" ? scenarioId : null,
      ],
    );
  }
}
