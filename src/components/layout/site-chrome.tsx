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
    return (
      <LinkButton href={homePathForRole(profile.role)} className="rounded-full px-4">
        Dashboard
      </LinkButton>
    );
  }

  return (
    <>
      <LinkButton href="/sign-in" variant="ghost" className="rounded-full">
        Sign in
      </LinkButton>
      <LinkButton href="/sign-up" className="hidden rounded-full px-4 min-[400px]:inline-flex">
        Get started
      </LinkButton>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-1.5">
          <LinkButton href="/academy" variant="ghost" className="hidden rounded-full min-[360px]:inline-flex">
            Academy
          </LinkButton>
          <LinkButton href="/professionals" variant="ghost" className="hidden rounded-full sm:inline-flex">
            Professionals
          </LinkButton>
          <Suspense fallback={<Skeleton className="h-9 w-24 rounded-full" />}>
            <HeaderAccount />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

const FOOTER_LINKS = [
  {
    title: "Platform",
    links: [
      { href: "/academy", label: "Academy" },
      { href: "/professionals", label: "Find a professional" },
      { href: "/academy/resources", label: "Learning resources" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/sign-up", label: "Create an account" },
      { href: "/privacy", label: "Privacy notice" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#b9c6dd]">
            Aviation psychology and human-performance learning for aspiring and student pilots in Europe.
          </p>
          <p className="mt-4 font-heading text-sm font-semibold text-warm">Learn to fly, make it high.</p>
        </div>
        {FOOTER_LINKS.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold tracking-wide text-sky uppercase">{group.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[#dce4f2] underline-offset-4 hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs leading-relaxed text-[#b9c6dd] sm:px-6">
          AeroMind prototype. All professionals, instructors, courses, questionnaires and reports are samples.
          AeroMind does not issue fitness certificates or replace a professional&apos;s judgment.
        </p>
      </div>
    </footer>
  );
}
