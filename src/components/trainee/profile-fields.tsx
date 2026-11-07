import { Field, SelectField } from "@/components/forms/action-form";
import type { TraineeProfile } from "@/lib/data/assessments";
import { TRAINING_STAGES } from "@/lib/labels";

const STAGE_OPTIONS = Object.entries(TRAINING_STAGES).map(([value, label]) => ({ value, label }));

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
];

export function TraineeProfileFields({
  displayName,
  profile,
}: {
  displayName: string;
  profile: TraineeProfile | null;
}) {
  return (
    <>
      <Field name="displayName" label="Full name" defaultValue={displayName} required />
      <SelectField
        name="trainingStage"
        label="Training stage"
        placeholder="Choose your stage"
        options={STAGE_OPTIONS}
        defaultValue={profile?.training_stage ?? ""}
      />
      <Field name="country" label="Country (optional)" defaultValue={profile?.country ?? ""} maxLength={80} />
      <SelectField
        name="preferredLanguage"
        label="Language for your development plan"
        options={LANGUAGE_OPTIONS}
        defaultValue={profile?.preferred_language ?? "en"}
      />
    </>
  );
}
