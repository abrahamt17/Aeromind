import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/forms/action-form";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { TraineeProfileFields } from "@/components/trainee/profile-fields";
import { PageHeader, Panel } from "@/components/ui-kit";
import { updateTraineeProfile } from "@/lib/actions/trainee";
import { requireRole } from "@/lib/auth/session";
import { getTraineeProfile } from "@/lib/data/assessments";

export const metadata: Metadata = { title: "Profile" };

async function Profile() {
  const user = await requireRole("trainee");
  const profile = await getTraineeProfile(user.id);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Your profile" description="Your training stage and language shape your development plan." />
      <Panel>
        <ActionForm action={updateTraineeProfile} submitLabel="Save changes">
          <TraineeProfileFields displayName={user.displayName} profile={profile} />
        </ActionForm>
      </Panel>
    </div>
  );
}

export default function TraineeProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Profile />
    </Suspense>
  );
}
