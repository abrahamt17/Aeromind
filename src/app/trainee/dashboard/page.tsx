import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { EmptyState, LinkButton, PageHeader, Panel, RequestList } from "@/components/ui-kit";
import { requireRole } from "@/lib/auth/session";
import { getTraineeProfile, listTraineeRequests } from "@/lib/data/assessments";
import { getDevelopment } from "@/lib/data/development";

export const metadata: Metadata = { title: "Dashboard" };

async function Dashboard() {
  const user = await requireRole("trainee");
  const profile = await getTraineeProfile(user.id);
  if (!profile?.onboarding_completed_at) redirect("/trainee/onboarding");

  const [requests, development] = await Promise.all([listTraineeRequests(user.id), getDevelopment(user.id)]);
  const items = development.flatMap((entry) => entry.plan?.items ?? []);
  const completed = items.filter((item) => item.completed_at).length;
  const progress = items.length ? Math.round((completed / items.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.displayName}`}
        description="Your assessments, reports and development plan in one place."
        action={<LinkButton href="/professionals">Find a professional</LinkButton>}
      />

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Your assessments</h2>
          {requests.length === 0 ? (
            <EmptyState
              title="No assessment requests yet"
              description="Choose an aviation-psychology professional to start your journey."
              action={<LinkButton href="/professionals">Browse professionals</LinkButton>}
            />
          ) : (
            <RequestList requests={requests} basePath="/trainee/assessments" />
          )}
        </div>

        <Panel title="Learning progress">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your plan will appear here after your professional releases a report.
            </p>
          ) : (
            <>
              <p className="text-3xl font-semibold">{progress}%</p>
              <p className="text-sm text-muted-foreground">
                {completed} of {items.length} activities completed
              </p>
              <div
                role="progressbar"
                aria-label="Learning progress"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                This tracks learning activity. It does not measure psychological fitness.
              </p>
            </>
          )}
          <div className="mt-4">
            <LinkButton href="/trainee/development" variant="outline" className="w-full">
              Open development plan
            </LinkButton>
          </div>
        </Panel>
      </div>
    </>
  );
}

export default function TraineeDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
