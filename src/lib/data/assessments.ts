import "server-only";
import { asUser } from "@/lib/db";
import type { AssessmentStatus, Competency, TrainingStage } from "@/lib/labels";

export type RequestSummary = {
  id: string;
  status: AssessmentStatus;
  created_at: Date;
  counterpart_name: string;
};

export type Recommendation = {
  id: string;
  competency: Competency;
  recommendation_text: string;
  educational_summary: string;
  approved_for_ai: boolean;
};

export type Report = {
  id: string;
  title: string;
  body: string | null;
  is_sample: boolean;
  released_at: Date | null;
};

export type Submission = {
  questionnaire_version: string;
  responses: { answers?: Record<string, string> };
  submitted_at: Date;
};

export type PrivateNote = { id: string; body: string; created_at: Date };

export type TraineeProfile = {
  training_stage: TrainingStage | null;
  country: string | null;
  preferred_language: string;
  onboarding_completed_at: Date | null;
};

export async function getTraineeProfile(userId: string): Promise<TraineeProfile | null> {
  return asUser(userId, (tx) =>
    tx.one<TraineeProfile>(
      `select training_stage, country, preferred_language, onboarding_completed_at
       from public.trainee_profiles where user_id = $1`,
      [userId],
    ),
  );
}

export async function listTraineeRequests(userId: string): Promise<RequestSummary[]> {
  return asUser(userId, (tx) =>
    tx.rows<RequestSummary>(
      `select r.id, r.status, r.created_at, p.display_name as counterpart_name
       from public.assessment_requests r
       join public.psychologist_profiles p on p.user_id = r.psychologist_id
       where r.trainee_id = $1
       order by r.created_at desc`,
      [userId],
    ),
  );
}

export async function listPsychologistRequests(userId: string): Promise<RequestSummary[]> {
  return asUser(userId, (tx) =>
    tx.rows<RequestSummary>(
      `select r.id, r.status, r.created_at, p.display_name as counterpart_name
       from public.assessment_requests r
       join public.profiles p on p.id = r.trainee_id
       where r.psychologist_id = $1
       order by r.created_at desc`,
      [userId],
    ),
  );
}

export type TraineeAssessment = {
  id: string;
  status: AssessmentStatus;
  trainee_message: string | null;
  created_at: Date;
  professional_id: string;
  professional_name: string;
  is_sample_professional: boolean;
  submission: Submission | null;
  report: Report | null;
  recommendations: Recommendation[];
};

export async function getTraineeAssessment(
  userId: string,
  requestId: string,
): Promise<TraineeAssessment | null> {
  return asUser(userId, async (tx) => {
    const request = await tx.one<
      Pick<TraineeAssessment, "id" | "status" | "trainee_message" | "created_at"> & {
        professional_id: string;
        professional_name: string;
        is_sample_professional: boolean;
      }
    >(
      `select r.id, r.status, r.trainee_message, r.created_at,
              p.user_id as professional_id, p.display_name as professional_name,
              p.is_sample as is_sample_professional
       from public.assessment_requests r
       join public.psychologist_profiles p on p.user_id = r.psychologist_id
       where r.id = $1 and r.trainee_id = $2`,
      [requestId, userId],
    );
    if (!request) return null;

    const submission = await tx.one<Submission>(
      `select questionnaire_version, responses, submitted_at
       from public.demo_questionnaire_submissions where assessment_request_id = $1`,
      [requestId],
    );
    const report = await tx.one<Report>(
      `select id, title, body, is_sample, released_at
       from public.professional_reports where assessment_request_id = $1`,
      [requestId],
    );
    const recommendations = await tx.rows<Recommendation>(
      `select id, competency, recommendation_text, educational_summary, approved_for_ai
       from public.professional_recommendations
       where assessment_request_id = $1 order by created_at`,
      [requestId],
    );

    return { ...request, submission, report, recommendations };
  });
}

export async function getReportForTrainee(
  userId: string,
  reportId: string,
): Promise<(Report & { assessment_request_id: string; professional_name: string; recommendations: Recommendation[] }) | null> {
  return asUser(userId, async (tx) => {
    const report = await tx.one<Report & { assessment_request_id: string; professional_name: string }>(
      `select rep.id, rep.title, rep.body, rep.is_sample, rep.released_at,
              rep.assessment_request_id, p.display_name as professional_name
       from public.professional_reports rep
       join public.assessment_requests r on r.id = rep.assessment_request_id
       join public.psychologist_profiles p on p.user_id = r.psychologist_id
       where rep.id = $1 and r.trainee_id = $2 and rep.released_at is not null`,
      [reportId, userId],
    );
    if (!report) return null;

    const recommendations = await tx.rows<Recommendation>(
      `select id, competency, recommendation_text, educational_summary, approved_for_ai
       from public.professional_recommendations
       where assessment_request_id = $1 order by created_at`,
      [report.assessment_request_id],
    );

    return { ...report, recommendations };
  });
}

export type PsychologistAssessment = {
  id: string;
  status: AssessmentStatus;
  trainee_message: string | null;
  created_at: Date;
  trainee_name: string;
  training_stage: TrainingStage | null;
  submission: Submission | null;
  recommendations: Recommendation[];
  notes: PrivateNote[];
  report: Report | null;
};

export async function getPsychologistAssessment(
  userId: string,
  requestId: string,
): Promise<PsychologistAssessment | null> {
  return asUser(userId, async (tx) => {
    const request = await tx.one<
      Pick<PsychologistAssessment, "id" | "status" | "trainee_message" | "created_at" | "trainee_name" | "training_stage">
    >(
      `select r.id, r.status, r.trainee_message, r.created_at,
              p.display_name as trainee_name, t.training_stage
       from public.assessment_requests r
       join public.profiles p on p.id = r.trainee_id
       join public.trainee_profiles t on t.user_id = r.trainee_id
       where r.id = $1 and r.psychologist_id = $2`,
      [requestId, userId],
    );
    if (!request) return null;

    const submission = await tx.one<Submission>(
      `select questionnaire_version, responses, submitted_at
       from public.demo_questionnaire_submissions where assessment_request_id = $1`,
      [requestId],
    );
    const recommendations = await tx.rows<Recommendation>(
      `select id, competency, recommendation_text, educational_summary, approved_for_ai
       from public.professional_recommendations
       where assessment_request_id = $1 order by created_at`,
      [requestId],
    );
    const notes = await tx.rows<PrivateNote>(
      `select id, body, created_at from public.assessment_private_notes
       where assessment_request_id = $1 order by created_at desc`,
      [requestId],
    );
    const report = await tx.one<Report>(
      `select id, title, body, is_sample, released_at
       from public.professional_reports where assessment_request_id = $1`,
      [requestId],
    );

    return { ...request, submission, recommendations, notes, report };
  });
}
