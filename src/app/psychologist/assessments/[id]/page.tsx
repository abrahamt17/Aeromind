import { Bot, Lock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { SampleLabel } from "@/components/brand/sample-label";
import { ActionForm, Field, SelectField, TextareaField } from "@/components/forms/action-form";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { LinkButton, PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import {
  addPrivateNote,
  addRecommendation,
  beginReview,
  deleteRecommendation,
  releaseReport,
  respondToRequest,
  saveReport,
  setRecommendationApproval,
} from "@/lib/actions/psychologist";
import { requireRole } from "@/lib/auth/session";
import { getPsychologistAssessment, type PsychologistAssessment } from "@/lib/data/assessments";
import { optionLabel, QUESTIONNAIRE_QUESTIONS } from "@/lib/demo/questionnaire";
import { COMPETENCIES, formatDate, TRAINING_STAGES } from "@/lib/labels";

export const metadata: Metadata = { title: "Assessment review" };

const COMPETENCY_OPTIONS = Object.entries(COMPETENCIES).map(([value, label]) => ({ value, label }));

function Responses({ assessment }: { assessment: PsychologistAssessment }) {
  const answers = assessment.submission?.responses.answers ?? {};

  return (
    <Panel title="Questionnaire responses" description={`Submitted ${formatDate(assessment.submission!.submitted_at)}`}>
      <SampleLabel className="mb-3">Demo questionnaire, not a validated instrument</SampleLabel>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {QUESTIONNAIRE_QUESTIONS.map((question) => (
          <div key={question.id}>
            <dt className="text-muted-foreground">{question.text}</dt>
            <dd className="font-medium">{optionLabel(answers[question.id])}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function Recommendations({ assessment }: { assessment: PsychologistAssessment }) {
  const editable = assessment.status === "in_review";

  return (
    <Panel
      title="Recommendations"
      description="Trainees see your recommendation once the report is released. Only summaries you approve can be used for a development plan."
    >
      {assessment.recommendations.length > 0 ? (
        <ul className="mb-5 space-y-3">
          {assessment.recommendations.map((recommendation) => (
            <li key={recommendation.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{COMPETENCIES[recommendation.competency]}</p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    recommendation.approved_for_ai ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Bot aria-hidden="true" className="size-3" />
                  {recommendation.approved_for_ai ? "Approved for plan" : "Not approved"}
                </span>
              </div>
              <p className="mt-2 text-sm">{recommendation.recommendation_text}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">Educational summary:</span> {recommendation.educational_summary}
              </p>
              {editable ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionForm
                    action={setRecommendationApproval.bind(null, recommendation.id, !recommendation.approved_for_ai)}
                    submitLabel={recommendation.approved_for_ai ? "Remove approval" : "Approve for plan"}
                    submitVariant={recommendation.approved_for_ai ? "outline" : "default"}
                    submitSize="sm"
                  />
                  <ActionForm
                    action={deleteRecommendation.bind(null, recommendation.id)}
                    submitLabel="Delete"
                    submitVariant="ghost"
                    submitSize="sm"
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-5 text-sm text-muted-foreground">No recommendations yet.</p>
      )}

      {editable ? (
        <ActionForm action={addRecommendation.bind(null, assessment.id)} submitLabel="Add recommendation" submitVariant="secondary">
          <SelectField name="competency" label="Competency" placeholder="Choose a competency" options={COMPETENCY_OPTIONS} />
          <TextareaField name="recommendationText" label="Recommendation for the trainee" maxLength={2000} />
          <TextareaField
            name="educationalSummary"
            label="Educational summary"
            maxLength={1000}
            hint="If approved, this text may be sent to an AI provider. Do not include names or clinical details."
          />
        </ActionForm>
      ) : null}
    </Panel>
  );
}

function ReportEditor({ assessment }: { assessment: PsychologistAssessment }) {
  const report = assessment.report;

  if (report?.released_at) {
    return (
      <Panel title="Released report" description={`Released ${formatDate(report.released_at)}`}>
        {report.is_sample ? <SampleLabel className="mb-3">Sample report</SampleLabel> : null}
        <p className="font-medium">{report.title}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{report.body}</p>
      </Panel>
    );
  }

  return (
    <Panel title="Report" description="Every report in this prototype is labelled as a sample.">
      <ActionForm
        action={saveReport.bind(null, assessment.id, report?.id ?? null)}
        submitLabel={report ? "Save draft" : "Create draft"}
        submitVariant="secondary"
      >
        <Field name="title" label="Title" defaultValue={report?.title ?? ""} maxLength={200} />
        <TextareaField
          name="body"
          label="Report"
          rows={8}
          defaultValue={report?.body ?? ""}
          hint="Do not state or imply an official fitness decision in this prototype."
        />
      </ActionForm>
      {report ? (
        <div className="mt-5 border-t pt-5">
          <p className="mb-3 text-sm text-muted-foreground">
            Releasing shows the report to the trainee and locks your recommendations.
          </p>
          <ActionForm action={releaseReport.bind(null, report.id)} submitLabel="Release report to trainee" />
        </div>
      ) : null}
    </Panel>
  );
}

function PrivateNotes({ assessment }: { assessment: PsychologistAssessment }) {
  return (
    <Panel>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Lock aria-hidden="true" className="size-4 text-brand" />
        Private notes
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Only you can see these. They are never shared with the trainee or an AI provider.
      </p>
      {assessment.notes.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {assessment.notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-muted p-3 text-sm">
              <p className="whitespace-pre-wrap">{note.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(note.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <ActionForm
        action={addPrivateNote.bind(null, assessment.id)}
        submitLabel="Save note"
        submitVariant="secondary"
        className="mt-4"
      >
        <TextareaField name="note" label="New note" maxLength={5000} />
      </ActionForm>
    </Panel>
  );
}

async function Assessment({ params }: { params: PageProps<"/psychologist/assessments/[id]">["params"] }) {
  const user = await requireRole("psychologist");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const assessment = await getPsychologistAssessment(user.id, id);
  if (!assessment) notFound();

  const closed = assessment.status === "declined" || assessment.status === "cancelled";
  const reviewing = assessment.status === "in_review" || assessment.status === "report_released";

  return (
    <>
      <PageHeader
        title={`Assessment for ${assessment.trainee_name}`}
        description={`Requested ${formatDate(assessment.created_at)}`}
        action={<StatusBadge status={assessment.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="space-y-5">
          {assessment.status === "requested" ? (
            <Panel title="New request" description="Accept to open the questionnaire for this trainee.">
              <div className="flex flex-wrap gap-3">
                <ActionForm action={respondToRequest.bind(null, assessment.id, true)} submitLabel="Accept request" />
                <ActionForm
                  action={respondToRequest.bind(null, assessment.id, false)}
                  submitLabel="Decline request"
                  submitVariant="outline"
                />
              </div>
            </Panel>
          ) : null}

          {assessment.status === "accepted" ? (
            <Panel title="Waiting for the trainee" description="The trainee has been asked to complete the demo questionnaire." />
          ) : null}

          {closed ? (
            <Panel title="Request closed">
              <p className="text-sm text-muted-foreground">
                This request was {assessment.status}. Submitted answers are no longer available to you.
              </p>
              <div className="mt-4">
                <LinkButton href="/psychologist/dashboard" variant="outline">Back to dashboard</LinkButton>
              </div>
            </Panel>
          ) : null}

          {assessment.submission ? <Responses assessment={assessment} /> : null}

          {assessment.status === "questionnaire_submitted" ? (
            <Panel title="Ready for review" description="Begin your review to record recommendations and prepare a report.">
              <ActionForm action={beginReview.bind(null, assessment.id)} submitLabel="Begin review" />
            </Panel>
          ) : null}

          {reviewing ? <Recommendations assessment={assessment} /> : null}
          {reviewing ? <ReportEditor assessment={assessment} /> : null}
        </div>

        <div className="space-y-5">
          <Panel title="Trainee">
            <p className="font-medium">{assessment.trainee_name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {assessment.training_stage ? TRAINING_STAGES[assessment.training_stage] : "Training stage not provided"}
            </p>
            {assessment.trainee_message ? (
              <p className="mt-3 text-sm text-muted-foreground">&ldquo;{assessment.trainee_message}&rdquo;</p>
            ) : null}
          </Panel>
          {!closed ? <PrivateNotes assessment={assessment} /> : null}
        </div>
      </div>
    </>
  );
}

export default function PsychologistAssessmentPage({ params }: PageProps<"/psychologist/assessments/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Assessment params={params} />
    </Suspense>
  );
}
