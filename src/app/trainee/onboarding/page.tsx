import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/forms/action-form";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { TraineeProfileFields } from "@/components/trainee/profile-fields";
import { PageHeader, Panel } from "@/components/ui-kit";
import { completeOnboarding } from "@/lib/actions/trainee";
import { requireRole } from "@/lib/auth/session";
import { getTraineeProfile } from "@/lib/data/assessments";

export const metadata: Metadata = { title: "Welcome" };

async function Onboarding() {
  const user = await requireRole("trainee");
  const profile = await getTraineeProfile(user.id);
  if (profile?.onboarding_completed_at) redirect("/trainee/dashboard");

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Welcome to AeroMind"
        description="A few details help us tailor your experience. We only ask for what we need."
      />
      <Panel>
        <ActionForm action={completeOnboarding} submitLabel="Continue to dashboard" fullWidth>
          <TraineeProfileFields displayName={user.displayName} profile={profile} />
        </ActionForm>
      </Panel>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Onboarding />
    </Suspense>
  );
}
