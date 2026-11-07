"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorState, invalidState } from "@/lib/actions/errors";
import type { ActionState } from "@/lib/actions/state";
import { getPlanGenerator } from "@/lib/ai";
import { generatedPlanSchema, planInputSchema } from "@/lib/ai/schema";
import { requireRole } from "@/lib/auth/session";
import { asUser } from "@/lib/db";
import { DEMO_POLICY_VERSION, DEMO_QUESTIONNAIRE_VERSION } from "@/lib/demo/data";
import { QUESTIONNAIRE_OPTIONS, QUESTIONNAIRE_QUESTIONS } from "@/lib/demo/questionnaire";

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(120),
  trainingStage: z.enum(["considering_career", "preparing_for_flight_school", "in_flight_training"], {
    error: "Choose your training stage",
  }),
  country: z.string().trim().max(80).optional(),
  preferredLanguage: z.string().trim().min(2, "Choose a language").max(12),
});

function formValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [...formData.entries()].filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && !entry[0].startsWith("$"),
    ),
  );
}

async function saveProfile(formData: FormData, complete: boolean): Promise<ActionState> {
  const profile = await requireRole("trainee");
  const parsed = profileSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalidState(parsed.error, formValues(formData));

  const { displayName, trainingStage, country, preferredLanguage } = parsed.data;

  try {
    await asUser(profile.id, async (tx) => {
      await tx.rows("update public.profiles set display_name = $1 where id = $2", [displayName, profile.id]);
      await tx.rows(
        `update public.trainee_profiles
         set training_stage = $1, country = $2, preferred_language = $3,
             onboarding_completed_at = coalesce(onboarding_completed_at, case when $4::boolean then now() end)
         where user_id = $5`,
        [trainingStage, country || null, preferredLanguage, complete, profile.id],
      );
    });
  } catch (error) {
    return errorState(error, formValues(formData));
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Your profile has been saved." };
}

export async function completeOnboarding(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const result = await saveProfile(formData, true);
  if (result.status === "error") return result;
  redirect("/trainee/dashboard");
}

export async function updateTraineeProfile(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return saveProfile(formData, false);
}

export async function requestAssessment(
  psychologistId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireRole("trainee");
  const message = z.string().trim().max(1000).safeParse(formData.get("message") ?? "");
  if (!message.success) {
    return { status: "error", message: "Keep your message to 1000 characters or fewer." };
  }

  let requestId: string;
  try {
    const row = await asUser(profile.id, (tx) =>
      tx.one<{ id: string }>("select public.request_assessment($1, $2) as id", [
        psychologistId,
        message.data,
      ]),
    );
    requestId = row!.id;
  } catch (error) {
    return errorState(error);
  }

  revalidatePath("/trainee/dashboard");
  redirect(`/trainee/assessments/${requestId}`);
}

export async function cancelRequest(requestId: string): Promise<ActionState> {
  const profile = await requireRole("trainee");

  try {
    await asUser(profile.id, (tx) => tx.rows("select public.cancel_assessment_request($1)", [requestId]));
  } catch (error) {
    return errorState(error);
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Your request has been cancelled." };
}

export async function submitQuestionnaire(
  requestId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireRole("trainee");
  const values = formValues(formData);

  const allowed = QUESTIONNAIRE_OPTIONS.map((option) => option.value as string);
  const answers: Record<string, string> = {};
  const fieldErrors: Record<string, string[]> = {};
  for (const question of QUESTIONNAIRE_QUESTIONS) {
    const answer = values[question.id];
    if (answer && allowed.includes(answer)) answers[question.id] = answer;
    else fieldErrors[question.id] = ["Choose an answer"];
  }
  if (values.consent !== "on") fieldErrors.consent = ["Your consent is required to continue"];

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Check the highlighted questions.", fieldErrors, values };
  }

  try {
    await asUser(profile.id, async (tx) => {
      await tx.rows("select public.grant_consent($1, 'questionnaire_processing', $2)", [
        requestId,
        DEMO_POLICY_VERSION,
      ]);
      await tx.rows("select public.submit_demo_questionnaire($1, $2, $3)", [
        requestId,
        DEMO_QUESTIONNAIRE_VERSION,
        JSON.stringify({ answers }),
      ]);
    });
  } catch (error) {
    return errorState(error, values);
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Your questionnaire has been submitted." };
}

export async function generatePlan(
  requestId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireRole("trainee");

  if (formData.get("consent") !== "on") {
    return {
      status: "error",
      message: "Your consent is required to generate a plan.",
      fieldErrors: { consent: ["Your consent is required to generate a plan"] },
    };
  }

  try {
    const input = await asUser(profile.id, async (tx) => {
      await tx.rows("select public.grant_consent($1, 'ai_development_plan', $2)", [
        requestId,
        DEMO_POLICY_VERSION,
      ]);
      return tx.one<{ input: unknown }>("select public.get_plan_generation_input($1) as input", [requestId]);
    });

    const parsedInput = planInputSchema.safeParse(input?.input);
    if (!parsedInput.success) {
      return { status: "error", message: "Your professional has not approved any recommendations for a plan." };
    }

    // Generation happens outside any database transaction because it can take a while.
    const generator = getPlanGenerator();
    const plan = generatedPlanSchema.safeParse(await generator.generate(parsedInput.data));
    if (!plan.success) {
      return { status: "error", message: "The plan did not pass our safety checks, so it was not saved. Please try again." };
    }

    await asUser(profile.id, async (tx) => {
      const scenario = await tx.one<{ id: string }>(
        "select id from public.learning_scenarios where published order by created_at limit 1",
      );
      const items = plan.data.items.map((item) => ({
        ...item,
        scenario_id: item.item_type === "scenario" ? (scenario?.id ?? null) : null,
      }));

      await tx.rows("select public.save_development_plan($1, $2, $3, $4, $5, $6, $7)", [
        requestId,
        plan.data.title,
        plan.data.summary,
        parsedInput.data.language,
        generator.model,
        parsedInput.data.recommendations.map((recommendation) => recommendation.id),
        JSON.stringify(items),
      ]);
    });
  } catch (error) {
    return errorState(error);
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Your development plan is ready." };
}

export async function withdrawAiConsent(requestId: string): Promise<ActionState> {
  const profile = await requireRole("trainee");

  try {
    await asUser(profile.id, (tx) =>
      tx.rows("select public.withdraw_consent($1, 'ai_development_plan')", [requestId]),
    );
  } catch (error) {
    return errorState(error);
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Your consent has been withdrawn. No new plans will be generated." };
}

export async function togglePlanItem(itemId: string, completed: boolean): Promise<void> {
  const profile = await requireRole("trainee");

  await asUser(profile.id, (tx) =>
    tx.rows(
      "update public.development_plan_items set completed_at = case when $1::boolean then now() end where id = $2",
      [completed, itemId],
    ),
  );

  revalidatePath("/", "layout");
}

const scenarioResultSchema = z.object({
  scenarioId: z.uuid(),
  planItemId: z.uuid().nullable(),
  choices: z.array(z.object({ stepId: z.string().max(80), choiceId: z.string().max(80) })).max(50),
});

export async function completeScenario(input: unknown): Promise<{ ok: boolean }> {
  const profile = await requireRole("trainee");
  const parsed = scenarioResultSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const { scenarioId, planItemId, choices } = parsed.data;

  try {
    await asUser(profile.id, async (tx) => {
      await tx.rows(
        `insert into public.scenario_attempts (scenario_id, trainee_id, plan_item_id, choices, completed_at)
         values ($1, $2, $3, $4, now())`,
        [scenarioId, profile.id, planItemId, JSON.stringify(choices)],
      );
      if (planItemId) {
        await tx.rows(
          "update public.development_plan_items set completed_at = coalesce(completed_at, now()) where id = $1",
          [planItemId],
        );
      }
    });
  } catch (error) {
    console.error(error);
    return { ok: false };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
