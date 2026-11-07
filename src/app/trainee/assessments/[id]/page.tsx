import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { SampleLabel } from "@/components/brand/sample-label";
import { ActionForm, CheckboxField, ChoiceGroup } from "@/components/forms/action-form";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { LinkButton, PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { cancelRequest, submitQuestionnaire } from "@/lib/actions/trainee";
import { requireRole } from "@/lib/auth/session";
import { getTraineeAssessment, type TraineeAssessment } from "@/lib/data/assessments";
import { optionLabel, QUESTIONNAIRE_OPTIONS, QUESTIONNAIRE_QUESTIONS } from "@/lib/demo/questionnaire";
import { formatDate } from "@/lib/labels";

export const metadata: Metadata = { title: "Assessment" };

function Questionnaire({ requestId }: { requestId: string }) {
  return (
    <Panel
      title="Demo self-reflection questionnaire"
      description="How confident do you feel in each situation? There are no right or wrong answers."
    >
      <div className="mb-5">
        <SampleLabel>Demonstration only, not a validated psychological test</SampleLabel>
      </div>
      <ActionForm
        action={submitQuestionnaire.bind(null, requestId)}
        submitLabel="Submit questionnaire"
        className="space-y-5"
      >
        {QUESTIONNAIRE_QUESTIONS.map((question) => (
          <ChoiceGroup key={question.id} name={question.id} legend={question.text} options={QUESTIONNAIRE_OPTIONS} />
        ))}
        <CheckboxField
          name="consent"
          label="I agree to share these answers with my assigned professional. They will not be sent to an AI provider."
        />
      </ActionForm>
    </Panel>
  );
}

function Answers({ assessment }: { assessment: TraineeAssessment }) {
  const answers = assessment.submission?.responses.answers ?? {};

  return (
    <Panel title="Your questionnaire answers">
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

const STATUS_MESSAGES: Partial<Record<TraineeAssessment["status"], string>> = {
  requested: "Your request has been sent. Your professional will accept or decline it.",
  questionnaire_submitted: "Your questionnaire is with your professional, who will begin the review soon.",
  in_review: "Your professional is reviewing your information and preparing a report.",
  declined: "This professional declined the request. You can choose another professional.",
  cancelled: "You cancelled this request.",
};

async function Assessment({ params }: { params: PageProps<"/trainee/assessments/[id]">["params"] }) {
  const user = await requireRole("trainee");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const assessment = await getTraineeAssessment(user.id, id);
  if (!assessment) notFound();

  const canCancel = ["requested", "accepted", "questionnaire_submitted"].includes(assessment.status);
  const released = assessment.status === "report_released" && assessment.report;

  return (
    <>
      <PageHeader
        title={`Assessment with ${assessment.professional_name}`}
        description={`Requested ${formatDate(assessment.created_at)}`}
        action={<StatusBadge status={assessment.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="space-y-5">
          {STATUS_MESSAGES[assessment.status] ? (
            <Panel title="Status">
              <p className="text-muted-foreground">{STATUS_MESSAGES[assessment.status]}</p>
              {assessment.status === "declined" ? (
                <div className="mt-4">
                  <LinkButton href="/professionals" variant="outline">Find another professional</LinkButton>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {assessment.status === "accepted" ? <Questionnaire requestId={assessment.id} /> : null}

          {released ? (
            <Panel
              title="Your report is ready"
              description="Your professional has released your report and recommendations."
            >
              <div className="flex flex-wrap gap-3">
                <LinkButton href={`/trainee/reports/${assessment.report!.id}`}>Read your report</LinkButton>
                <LinkButton href="/trainee/development" variant="outline">Open development plan</LinkButton>
              </div>
            </Panel>
          ) : null}

          {assessment.submission ? <Answers assessment={assessment} /> : null}
        </div>

        <div className="space-y-5">
          {assessment.trainee_message ? (
            <Panel title="Your message">
              <p className="text-sm text-muted-foreground">{assessment.trainee_message}</p>
            </Panel>
          ) : null}
          <Panel title="Your professional">
            <p className="font-medium">{assessment.professional_name}</p>
            {assessment.is_sample_professional ? <SampleLabel className="mt-2">Sample profile</SampleLabel> : null}
            <div className="mt-4">
              <LinkButton href={`/professionals/${assessment.professional_id}`} variant="outline" className="w-full">
                View profile
              </LinkButton>
            </div>
          </Panel>
          {canCancel ? (
            <Panel title="Changed your mind?" description="You can cancel until the review begins.">
              <ActionForm
                action={cancelRequest.bind(null, assessment.id)}
                submitLabel="Cancel request"
                submitVariant="destructive"
              />
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function TraineeAssessmentPage({ params }: PageProps<"/trainee/assessments/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Assessment params={params} />
    </Suspense>
  );
}
