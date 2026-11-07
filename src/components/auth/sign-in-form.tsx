import { ActionForm, Field } from "@/components/forms/action-form";
import { signIn } from "@/lib/auth/actions";

export function SignInForm() {
  return (
    <ActionForm action={signIn} submitLabel="Sign in" submitSize="lg" fullWidth className="space-y-5">
      <Field name="email" label="Email" type="email" autoComplete="email" required />
      <Field name="password" label="Password" type="password" autoComplete="current-password" required />
    </ActionForm>
  );
}
