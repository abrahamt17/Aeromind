"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorState, invalidState } from "@/lib/actions/errors";
import type { ActionState } from "@/lib/actions/state";
import { requireRole } from "@/lib/auth/session";
import { asUser, type Tx } from "@/lib/db";
import { COMPETENCIES, type Competency } from "@/lib/labels";

function formValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [...formData.entries()].filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && !entry[0].startsWith("$"),
    ),
  );
}

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(120),
  headline: z.string().trim().min(1, "Enter a headline").max(160),
  bio: z.string().trim().min(1, "Enter a short bio").max(2000),
  qualifications: z.string().trim().max(1000).optional(),
  specialties: z.string().trim().max(1000).optional(),
  languages: z.string().trim().max(500).optional(),
  consultationFormats: z.string().trim().max(200).optional(),
  country: z.string().trim().max(80).optional(),
});

async function saveProfile(formData: FormData): Promise<ActionState> {
  const profile = await requireRole("psychologist");
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return invalidState(parsed.error, values);

  const data = parsed.data;

  try {
    await asUser(profile.id, async (tx) => {
      await tx.rows("update public.profiles set display_name = $1 where id = $2", [
        data.displayName,
        profile.id,
      ]);
      await tx.rows(
        `update public.psychologist_profiles set
           display_name = $1, headline = $2, bio = $3, qualifications = $4, specialties = $5,
           languages = $6, consultation_formats = $7, country = $8, accepting_requests = $9,
           published = $10, onboarding_completed_at = coalesce(onboarding_completed_at, now())
         where user_id = $11`,
        [
          data.displayName,
          data.headline,
          data.bio,
          list(data.qualifications),
          list(data.specialties),
          list(data.languages),
          list(data.consultationFormats),
          data.country || null,
          values.acceptingRequests === "on",
          values.published === "on",
          profile.id,
        ],
      );
    });
  } catch (error) {
    return errorState(error, values);
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Your profile has been saved." };
}

export async function updatePsychologistProfile(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return saveProfile(formData);
}

export async function completePsychologistOnboarding(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const result = await saveProfile(formData);
  if (result.status === "error") return result;
  redirect("/psychologist/dashboard");
}

/** Runs one change on an assessment as the signed-in psychologist. */
async function act(work: (tx: Tx) => Promise<unknown>, message?: string): Promise<ActionState> {
  const profile = await requireRole("psychologist");

  try {
    await asUser(profile.id, work);
  } catch (error) {
    return errorState(error);
  }

  revalidatePath("/", "layout");
  return { status: "success", message };
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<ActionState> {
  return act((tx) => tx.rows("select public.respond_to_assessment_request($1, $2)", [requestId, accept]));
}

export async function beginReview(requestId: string): Promise<ActionState> {
  return act((tx) => tx.rows("select public.begin_assessment_review($1)", [requestId]));
}

const recommendationSchema = z.object({
  competency: z.enum(Object.keys(COMPETENCIES) as [Competency, ...Competency[]], {
    error: "Choose a competency",
  }),
  recommendationText: z.string().trim().min(1, "Enter your recommendation").max(2000),
  educationalSummary: z.string().trim().min(1, "Enter an educational summary").max(1000),
});

export async function addRecommendation(
  requestId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = recommendationSchema.safeParse(values);
  if (!parsed.success) return invalidState(parsed.error, values);

  const { competency, recommendationText, educationalSummary } = parsed.data;

  return act(
    (tx) =>
      tx.rows(
        `insert into public.professional_recommendations
           (assessment_request_id, competency, recommendation_text, educational_summary)
         values ($1, $2, $3, $4)`,
        [requestId, competency, recommendationText, educationalSummary],
      ),
    "Recommendation added.",
  );
}

export async function deleteRecommendation(recommendationId: string): Promise<ActionState> {
  return act((tx) =>
    tx.rows("delete from public.professional_recommendations where id = $1", [recommendationId]),
  );
}

export async function setRecommendationApproval(recommendationId: string, approved: boolean): Promise<ActionState> {
  return act((tx) =>
    tx.rows("select public.set_recommendation_ai_approval($1, $2)", [recommendationId, approved]),
  );
}

export async function addPrivateNote(
  requestId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const body = z.string().trim().min(1).max(5000).safeParse(formData.get("note"));
  if (!body.success) {
    return { status: "error", message: "Enter a note of up to 5000 characters." };
  }

  return act(
    (tx) =>
      tx.rows("insert into public.assessment_private_notes (assessment_request_id, body) values ($1, $2)", [
        requestId,
        body.data,
      ]),
    "Note saved.",
  );
}

const reportSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(200),
  body: z.string().trim().min(1, "Enter the report").max(20000),
});

export async function saveReport(
  requestId: string,
  reportId: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = reportSchema.safeParse(values);
  if (!parsed.success) return invalidState(parsed.error, values);

  const { title, body } = parsed.data;

  return act(
    (tx) =>
      reportId
        ? tx.rows("update public.professional_reports set title = $1, body = $2 where id = $3", [
            title,
            body,
            reportId,
          ])
        : tx.rows(
            "insert into public.professional_reports (assessment_request_id, title, body) values ($1, $2, $3)",
            [requestId, title, body],
          ),
    "Report draft saved.",
  );
}

export async function releaseReport(reportId: string): Promise<ActionState> {
  return act((tx) => tx.rows("select public.release_report($1)", [reportId]), "Report released to the trainee.");
}
