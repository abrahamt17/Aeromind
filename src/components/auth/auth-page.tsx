import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FlightPath } from "@/components/brand/flight-path";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/layout/site-chrome";
import { homePathForRole } from "@/lib/auth/routes";
import { getCurrentProfile } from "@/lib/auth/session";

async function RedirectIfSignedIn() {
  const profile = await getCurrentProfile();
  if (profile) redirect(homePathForRole(profile.role));
  return null;
}

const POINTS = [
  "Find aviation psychologists by specialty and language",
  "Learn with courses, quizzes and an AI tutor",
  "Turn professional feedback into a personal plan",
];

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
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <main className="grid flex-1 lg:grid-cols-[1fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-navy p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <FlightPath />
          <div className="relative">
            <Logo tone="light" />
          </div>
          <div className="relative">
            <h2 className="text-4xl leading-tight font-bold">From assessment to development, for the next generation of pilots.</h2>
            <ul className="mt-8 space-y-4">
              {POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-[#dce4f2]">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sky" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative font-heading text-sm font-semibold text-warm">Learn to fly, make it high.</p>
        </aside>
        <div className="flex flex-col px-4 py-8 sm:px-10">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
            <p className="mt-3 text-muted-foreground">{description}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
