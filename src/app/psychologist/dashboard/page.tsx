import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { EmptyState, LinkButton, PageHeader, Panel, RequestList } from "@/components/ui-kit";
import { requireRole } from "@/lib/auth/session";
import { listPsychologistRequests } from "@/lib/data/assessments";
import { getOwnProfessionalProfile } from "@/lib/data/professionals";

export const metadata: Metadata = { title: "Dashboard" };

const NEEDS_ACTION = ["requested", "questionnaire_submitted", "in_review"];

async function Dashboard() {
  const user = await requireRole("psychologist");
  const profile = await getOwnProfessionalProfile(user.id);
  if (!profile?.onboarding_completed_at) redirect("/psychologist/onboarding");

  const requests = await listPsychologistRequests(user.id);
  const action = requests.filter((request) => NEEDS_ACTION.includes(request.status));
  const other = requests.filter((request) => !NEEDS_ACTION.includes(request.status));

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.displayName}`}
        description="Manage assessment requests, reviews and reports."
        action={<LinkButton href="/psychologist/profile" variant="outline">Edit profile</LinkButton>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <p className="text-3xl font-semibold">{action.length}</p>
          <p className="text-sm text-muted-foreground">Need your attention</p>
        </Panel>
        <Panel>
          <p className="text-3xl font-semibold">{requests.filter((r) => r.status === "report_released").length}</p>
          <p className="text-sm text-muted-foreground">Reports released</p>
        </Panel>
        <Panel>
          <p className="text-3xl font-semibold">{requests.length}</p>
          <p className="text-sm text-muted-foreground">Total requests</p>
        </Panel>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Needs your attention</h2>
          {action.length === 0 ? (
            <EmptyState title="You are all caught up" description="New requests from trainees will appear here." />
          ) : (
            <RequestList requests={action} basePath="/psychologist/assessments" />
          )}
        </section>

        {other.length > 0 ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Other requests</h2>
            <RequestList requests={other} basePath="/psychologist/assessments" />
          </section>
        ) : null}
      </div>
    </>
  );
}

export default function PsychologistDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
