import { CheckboxField, Field, TextareaField } from "@/components/forms/action-form";
import type { Professional } from "@/lib/data/professionals";

export function ProfessionalProfileFields({
  displayName,
  profile,
}: {
  displayName: string;
  profile: Professional | null;
}) {
  return (
    <>
      <Field name="displayName" label="Full name" defaultValue={profile?.display_name ?? displayName} required />
      <Field name="headline" label="Headline" defaultValue={profile?.headline ?? ""} maxLength={160} required />
      <TextareaField name="bio" label="About you" defaultValue={profile?.bio ?? ""} maxLength={2000} required />
      <Field
        name="qualifications"
        label="Qualifications"
        hint="Separate each one with a comma."
        defaultValue={profile?.qualifications.join(", ") ?? ""}
      />
      <Field
        name="specialties"
        label="Specialties"
        hint="Separate each one with a comma."
        defaultValue={profile?.specialties.join(", ") ?? ""}
      />
      <Field
        name="languages"
        label="Languages"
        hint="Separate each one with a comma."
        defaultValue={profile?.languages.join(", ") ?? ""}
      />
      <Field
        name="consultationFormats"
        label="Consultation formats"
        hint="For example: Online, In person."
        defaultValue={profile?.consultation_formats.join(", ") ?? ""}
      />
      <Field name="country" label="Country" defaultValue={profile?.country ?? ""} maxLength={80} />
      <CheckboxField
        name="published"
        label="Show my profile in the directory"
        defaultChecked={profile?.onboarding_completed_at ? profile.published : true}
      />
      <CheckboxField
        name="acceptingRequests"
        label="I am accepting assessment requests"
        defaultChecked={profile?.accepting_requests ?? true}
      />
    </>
  );
}
