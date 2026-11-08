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
      <section className="mb-8 rounded-2xl border border-brand/20 bg-brand-soft/60 p-5">
        <SampleLabel>Try the prototype</SampleLabel>
        <p className="mt-3 text-sm text-muted-foreground">
          Explore with a synthetic account. No password is needed.
        </p>
        <form action={signInToDemo} className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <Button type="submit" size="lg" className="rounded-full" name="role" value="trainee">
            Demo trainee
          </Button>
          <Button type="submit" size="lg" variant="outline" className="rounded-full bg-card" name="role" value="psychologist">
            Demo psychologist
          </Button>
        </form>
      </section>
      <p className="mb-6 flex items-center gap-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        or sign in with email
        <span className="h-px flex-1 bg-border" />
      </p>
      <SignInForm />
    </AuthPage>
  );
}
