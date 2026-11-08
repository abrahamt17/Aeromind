import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { NavLinks, NavLinksView } from "@/components/layout/nav-links";
import { SiteFooter } from "@/components/layout/site-chrome";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/auth/actions";
import { getCurrentProfile } from "@/lib/auth/session";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

async function AccountMenu() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="hidden min-w-0 items-center gap-2.5 md:flex">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-heading text-xs font-bold text-brand"
        >
          {initials(profile.displayName)}
        </span>
        <span className="max-w-44 truncate text-sm font-medium">{profile.displayName}</span>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="rounded-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}

export function AppShell({
  home,
  nav,
  children,
}: {
  home: string;
  nav: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href={home} />
          <Suspense fallback={<Skeleton className="h-9 w-24 rounded-full" />}>
            <AccountMenu />
          </Suspense>
        </div>
        <Suspense fallback={<NavLinksView items={nav} pathname="" />}>
          <NavLinks items={nav} />
        </Suspense>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      <SiteFooter />
    </>
  );
}
