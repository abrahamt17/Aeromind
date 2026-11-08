import { BookOpenCheck, ClipboardList, FileCheck2, GraduationCap, ListChecks, Route } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProgressRing, QuickLink, StatCard, WelcomeBanner } from "@/components/dashboard";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { EmptyState, LinkButton, RequestList } from "@/components/ui-kit";
import { requireRole } from "@/lib/auth/session";
import { getTraineeProfile, listTraineeRequests } from "@/lib/data/assessments";
import { getDevelopment } from "@/lib/data/development";

export const metadata: Metadata = { title: "Dashboard" };

const LIGHT_OUTLINE = "rounded-full border-white/25 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white";

async function Dashboard() {
  const user = await requireRole("trainee");
  const profile = await getTraineeProfile(user.id);
  if (!profile?.onboarding_completed_at) redirect("/trainee/onboarding");

  const [requests, development] = await Promise.all([listTraineeRequests(user.id), getDevelopment(user.id)]);
  const items = development.flatMap((entry) => entry.plan?.items ?? []);
  const completed = items.filter((item) => item.completed_at).length;
  const progress = items.length ? Math.round((completed / items.length) * 100) : 0;
  const released = requests.filter((request) => request.status === "report_released").length;

  return (
    <>
      <WelcomeBanner
        eyebrow="Trainee dashboard"
        title={`Welcome back, ${user.displayName}`}
        description="Your assessments, reports and development plan in one place. Progress tracks learning activity, not psychological fitness."
        actions={
          <>
            {items.length > 0 ? (
              <LinkButton href="/trainee/development" size="lg" className="rounded-full bg-white px-5 text-navy hover:bg-white/90">
                Continue your plan
              </LinkButton>
            ) : (
              <LinkButton href="/professionals" size="lg" className="rounded-full bg-white px-5 text-navy hover:bg-white/90">
                Find a professional
              </LinkButton>
            )}
            <LinkButton href="/academy" size="lg" variant="outline" className={LIGHT_OUTLINE}>
              Open the Academy
            </LinkButton>
          </>
        }
        aside={items.length > 0 ? <ProgressRing value={progress} label="plan done" /> : null}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={ClipboardList} value={requests.length} label="Assessment requests" />
        <StatCard icon={FileCheck2} value={released} label="Reports released" />
        <StatCard icon={ListChecks} value={`${completed} / ${items.length}`} label="Plan activities done" tone="warm" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-start">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Your assessments</h2>
          {requests.length === 0 ? (
            <EmptyState
              title="No assessment requests yet"
              description="Choose an aviation-psychology professional to start your journey."
              action={<LinkButton href="/professionals">Browse professionals</LinkButton>}
            />
          ) : (
            <RequestList requests={requests} basePath="/trainee/assessments" />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Keep going</h2>
          <div className="space-y-3">
            <QuickLink href="/trainee/development" icon={Route} title="Development plan" description="Activities from approved recommendations" />
            <QuickLink href="/trainee/learning" icon={BookOpenCheck} title="My learning" description="Courses, quiz results and saved resources" />
            <QuickLink href="/academy" icon={GraduationCap} title="Academy" description="Courses with an AI tutor that cites the lesson" />
          </div>
        </section>
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
