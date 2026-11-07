import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/forms/action-form";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { ProfessionalProfileFields } from "@/components/psychologist/profile-fields";
import { LinkButton, PageHeader, Panel } from "@/components/ui-kit";
import { updatePsychologistProfile } from "@/lib/actions/psychologist";
import { requireRole } from "@/lib/auth/session";
import { getOwnProfessionalProfile } from "@/lib/data/professionals";
import { VERIFICATION_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Profile" };

async function Profile() {
  const user = await requireRole("psychologist");
  const profile = await getOwnProfessionalProfile(user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Your professional profile"
        description={`Verification: ${profile ? VERIFICATION_LABELS[profile.verification_status] : "Not verified"}. You cannot change this yourself.`}
        action={
          profile?.published ? (
            <LinkButton href={`/professionals/${user.id}`} variant="outline">View public profile</LinkButton>
          ) : undefined
        }
      />
      <Panel>
        <ActionForm action={updatePsychologistProfile} submitLabel="Save changes">
          <ProfessionalProfileFields displayName={user.displayName} profile={profile} />
        </ActionForm>
      </Panel>
    </div>
  );
}

export default function PsychologistProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Profile />
    </Suspense>
  );
}
