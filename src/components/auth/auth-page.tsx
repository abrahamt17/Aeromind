import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { homePathForRole } from "@/lib/auth/routes";
import { getCurrentProfile } from "@/lib/auth/session";

async function RedirectIfSignedIn() {
  const profile = await getCurrentProfile();
  if (profile) redirect(homePathForRole(profile.role));
  return null;
}

export function AuthPage({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
      </main>
      <SiteFooter />
    </>
  );
}
