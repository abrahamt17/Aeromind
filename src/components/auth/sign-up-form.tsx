import Link from "next/link";
import { ActionForm, Field, RadioCards } from "@/components/forms/action-form";
import { signUp } from "@/lib/auth/actions";

const ROLE_OPTIONS = [
  { value: "trainee", title: "Trainee", description: "I am an aspiring or student pilot." },
  { value: "psychologist", title: "Psychologist", description: "I offer aviation-psychology services." },
];

export function SignUpForm() {
  return (
    <ActionForm action={signUp} submitLabel="Create account" submitSize="lg" fullWidth className="space-y-5">
      <RadioCards name="role" legend="I am joining as" options={ROLE_OPTIONS} defaultValue="trainee" />

      <Field name="displayName" label="Full name" autoComplete="name" required />
      <Field name="email" label="Email" type="email" autoComplete="email" required />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="Use at least 10 characters."
        required
      />

      <p className="text-sm text-muted-foreground">
        This is a prototype. Do not enter real health or psychological information. Read the{" "}
        <Link href="/privacy" className="text-foreground underline underline-offset-4">
          privacy notice
        </Link>
        .
      </p>
    </ActionForm>
  );
}
