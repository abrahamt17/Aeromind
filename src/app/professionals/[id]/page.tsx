import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { SampleLabel } from "@/components/brand/sample-label";
import { ActionForm, TextareaField } from "@/components/forms/action-form";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { LinkButton, PageHeader, Panel } from "@/components/ui-kit";
import { requestAssessment } from "@/lib/actions/trainee";
import { getCurrentProfile } from "@/lib/auth/session";
import { getProfessional, type Professional } from "@/lib/data/professionals";
import { VERIFICATION_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Professional profile" };

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
          {item}
        </li>
      ))}
    </ul>
  );
}

async function RequestPanel({ professional }: { professional: Professional }) {
  const viewer = await getCurrentProfile();

  if (!professional.accepting_requests) {
    return (
      <Panel title="Request an assessment">
        <p className="text-sm text-muted-foreground">
          This sample profile is not accepting requests. Dr Elena Marsh (sample) can be used for the full demo.
        </p>
        <div className="mt-4">
          <LinkButton href="/professionals" variant="outline">Back to directory</LinkButton>
        </div>
      </Panel>
    );
  }

  if (!viewer) {
    return (
      <Panel title="Request an assessment" description="Sign in as a trainee to send a request.">
        <LinkButton href="/sign-in" className="w-full">Sign in to continue</LinkButton>
      </Panel>
    );
  }

  if (viewer.role !== "trainee") {
    return (
      <Panel title="Request an assessment">
        <p className="text-sm text-muted-foreground">Only trainee accounts can send requests.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Request an assessment"
      description="Your professional will accept or decline. Do not include real health information in this prototype."
    >
      <ActionForm action={requestAssessment.bind(null, professional.user_id)} submitLabel="Send request" fullWidth>
        <TextareaField
          name="message"
          label="Message (optional)"
          maxLength={1000}
          placeholder="What would you like support with?"
        />
      </ActionForm>
    </Panel>
  );
}

async function Profile({ params }: { params: PageProps<"/professionals/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const professional = await getProfessional(id);
  if (!professional) notFound();

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {professional.is_sample ? <SampleLabel>Sample profile</SampleLabel> : null}
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {VERIFICATION_LABELS[professional.verification_status]}
        </span>
      </div>
      <PageHeader title={professional.display_name} description={professional.headline} />

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Panel title="About">
            <p className="text-muted-foreground">{professional.bio}</p>
          </Panel>
          <Panel title="Specialties">
            <Tags items={professional.specialties} />
          </Panel>
          <Panel title="Qualifications">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {professional.qualifications.map((qualification) => (
                <li key={qualification}>{qualification}</li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <RequestPanel professional={professional} />
          <Panel title="Details">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Languages</dt>
                <dd>{professional.languages.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Consultation formats</dt>
                <dd>{professional.consultation_formats.join(", ")}</dd>
              </div>
              {professional.country ? (
                <div>
                  <dt className="text-muted-foreground">Country</dt>
                  <dd>{professional.country}</dd>
                </div>
              ) : null}
              {professional.years_experience !== null ? (
                <div>
                  <dt className="text-muted-foreground">Experience</dt>
                  <dd>{professional.years_experience} years (illustrative)</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

export default function ProfessionalPage({ params }: PageProps<"/professionals/[id]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<PageSkeleton />}>
          <Profile params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
