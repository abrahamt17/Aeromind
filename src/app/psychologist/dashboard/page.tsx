import { BellRing, FileCheck2, Inbox } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StatCard, WelcomeBanner } from "@/components/dashboard";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { EmptyState, LinkButton, RequestList } from "@/components/ui-kit";
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
  const released = requests.filter((request) => request.status === "report_released").length;

  return (
    <>
      <WelcomeBanner
        eyebrow="Psychologist dashboard"
        title={`Welcome back, ${user.displayName}`}
        description="Manage assessment requests, reviews and reports. You decide what can be used for learning."
        actions={
          <>
            <LinkButton href="/psychologist/profile" size="lg" className="rounded-full bg-white px-5 text-navy hover:bg-white/90">
              Edit your profile
            </LinkButton>
            <LinkButton
              href="/academy"
              size="lg"
              variant="outline"
              className="rounded-full border-white/25 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white"
            >
              Open the Academy
            </LinkButton>
          </>
        }
        aside={
          <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-6 text-center">
            <p className="font-heading text-5xl font-bold text-warm">{action.length}</p>
            <p className="mt-1 text-sm text-[#b9c6dd]">need your attention</p>
          </div>
        }
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard icon={BellRing} value={action.length} label="Need your attention" tone="warm" />
        <StatCard icon={FileCheck2} value={released} label="Reports released" />
        <StatCard icon={Inbox} value={requests.length} label="Total requests" />
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Needs your attention</h2>
          {action.length === 0 ? (
            <EmptyState title="You are all caught up" description="New requests from trainees will appear here." />
          ) : (
            <RequestList requests={action} basePath="/psychologist/assessments" />
          )}
        </section>

        {other.length > 0 ? (
          <section>
            <h2 className="mb-4 text-xl font-semibold">Other requests</h2>
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
