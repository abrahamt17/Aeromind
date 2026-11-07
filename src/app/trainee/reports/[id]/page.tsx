import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { SampleLabel } from "@/components/brand/sample-label";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { LinkButton, PageHeader, Panel } from "@/components/ui-kit";
import { requireRole } from "@/lib/auth/session";
import { getReportForTrainee } from "@/lib/data/assessments";
import { COMPETENCIES, formatDate } from "@/lib/labels";

export const metadata: Metadata = { title: "Report" };

async function Report({ params }: { params: PageProps<"/trainee/reports/[id]">["params"] }) {
  const user = await requireRole("trainee");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const report = await getReportForTrainee(user.id, id);
  if (!report) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      {report.is_sample ? <SampleLabel className="mb-3">Sample report</SampleLabel> : null}
      <PageHeader
        title={report.title}
        description={`From ${report.professional_name}${report.released_at ? `, released ${formatDate(report.released_at)}` : ""}`}
      />

      <div className="space-y-5">
        <Panel title="Report">
          <p className="whitespace-pre-wrap text-muted-foreground">{report.body}</p>
        </Panel>

        {report.recommendations.length > 0 ? (
          <Panel title="Recommendations">
            <ul className="space-y-4">
              {report.recommendations.map((recommendation) => (
                <li key={recommendation.id}>
                  <p className="font-medium">{COMPETENCIES[recommendation.competency]}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{recommendation.recommendation_text}</p>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        <p className="text-sm text-muted-foreground">
          This document does not certify fitness to fly. AeroMind facilitates the process and does not replace your
          professional&apos;s judgment.
        </p>

        <div className="flex flex-wrap gap-3">
          <LinkButton href="/trainee/development">Open development plan</LinkButton>
          <LinkButton href={`/trainee/assessments/${report.assessment_request_id}`} variant="outline">
            Back to assessment
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

export default function TraineeReportPage({ params }: PageProps<"/trainee/reports/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Report params={params} />
    </Suspense>
  );
}
