import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkButton } from "@/components/ui-kit";
import { homePathForRole } from "@/lib/auth/routes";
import { getCurrentProfile } from "@/lib/auth/session";

async function HeaderAccount() {
  const profile = await getCurrentProfile();

  if (profile) {
    return <LinkButton href={homePathForRole(profile.role)}>Dashboard</LinkButton>;
  }

  return (
    <>
      <LinkButton href="/sign-in" variant="ghost">
        Sign in
      </LinkButton>
      <LinkButton href="/sign-up" className="hidden min-[400px]:inline-flex">
        Create account
      </LinkButton>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <LinkButton href="/professionals" variant="ghost" className="hidden sm:inline-flex">
            Find a professional
          </LinkButton>
          <LinkButton href="/academy" variant="ghost" className="hidden min-[360px]:inline-flex">
            Academy
          </LinkButton>
          <Suspense fallback={<Skeleton className="h-9 w-20" />}>
            <HeaderAccount />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>AeroMind prototype. All professionals, instructors, courses, questionnaires and reports are samples.</p>
        <div className="flex gap-4">
          <Link href="/academy" className="underline-offset-4 hover:underline">
            Academy
          </Link>
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy notice
          </Link>
        </div>
      </div>
    </footer>
  );
}
