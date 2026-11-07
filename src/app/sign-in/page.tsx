import type { Metadata } from "next";
import Link from "next/link";
import { AuthPage } from "@/components/auth/auth-page";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SampleLabel } from "@/components/brand/sample-label";
import { Button } from "@/components/ui/button";
import { signInToDemo } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthPage
      title="Sign in"
      description="Continue your aviation-psychology journey."
      footer={
        <>
          New to AeroMind?{" "}
          <Link href="/sign-up" className="text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <section className="mb-8 rounded-xl border bg-card p-4">
        <SampleLabel>Try the prototype</SampleLabel>
        <p className="mt-2 text-sm text-muted-foreground">
          Explore with a synthetic account. No password is needed.
        </p>
        <form action={signInToDemo} className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button type="submit" variant="outline" name="role" value="trainee">
            Demo trainee
          </Button>
          <Button type="submit" variant="outline" name="role" value="psychologist">
            Demo psychologist
          </Button>
        </form>
      </section>
      <SignInForm />
    </AuthPage>
  );
}
