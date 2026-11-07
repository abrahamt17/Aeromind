import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/layout/site-chrome";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/auth/actions";
import { getCurrentProfile } from "@/lib/auth/session";

async function AccountMenu() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:block">
        {profile.displayName}
      </span>
      <form action={signOut}>
        <Button type="submit" variant="outline">
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
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href={home} />
          <Suspense fallback={<Skeleton className="h-9 w-24" />}>
            <AccountMenu />
          </Suspense>
        </div>
        <nav aria-label="Main" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <SiteFooter />
    </>
  );
}
