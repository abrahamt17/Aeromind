import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/forms/action-form";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { ProfessionalProfileFields } from "@/components/psychologist/profile-fields";
import { PageHeader, Panel } from "@/components/ui-kit";
import { completePsychologistOnboarding } from "@/lib/actions/psychologist";
import { requireRole } from "@/lib/auth/session";
import { getOwnProfessionalProfile } from "@/lib/data/professionals";

export const metadata: Metadata = { title: "Set up your profile" };

async function Onboarding() {
  const user = await requireRole("psychologist");
  const profile = await getOwnProfessionalProfile(user.id);
  if (profile?.onboarding_completed_at) redirect("/psychologist/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Set up your professional profile"
        description="Trainees use this to decide who to contact. Your profile will show as not verified until credentials are checked."
      />
      <Panel>
        <ActionForm action={completePsychologistOnboarding} submitLabel="Save and continue" fullWidth>
          <ProfessionalProfileFields displayName={user.displayName} profile={profile} />
        </ActionForm>
      </Panel>
    </div>
  );
}

export default function PsychologistOnboardingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Onboarding />
    </Suspense>
  );
}
