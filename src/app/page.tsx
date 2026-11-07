import { ArrowRight, BookOpenCheck, ClipboardList, ShieldCheck, UserRoundSearch } from "lucide-react";
import { SampleLabel } from "@/components/brand/sample-label";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { LinkButton } from "@/components/ui-kit";

const JOURNEY = [
  { title: "Find a professional", description: "Compare profiles by specialty, language and consultation format." },
  { title: "Request an assessment", description: "Share your request and complete a preliminary questionnaire." },
  { title: "Receive your report", description: "Your professional reviews your information and releases a report." },
  { title: "Keep developing", description: "Follow an educational plan built from recommendations they approved." },
];

const PILLARS = [
  {
    icon: UserRoundSearch,
    title: "Professional marketplace",
    description:
      "Discover aviation-psychology professionals and understand their qualifications before you request anything.",
  },
  {
    icon: ClipboardList,
    title: "Assessment and reporting",
    description:
      "Professionals manage requests, review submissions and prepare reports. Their judgment stays at the centre.",
  },
  {
    icon: BookOpenCheck,
    title: "Development companion",
    description:
      "Educational plans and aviation scenarios, created only from recommendations your professional has approved.",
  },
];

const AUDIENCES = [
  {
    title: "For aspiring and student pilots",
    points: [
      "One place for your assessment documents and plan",
      "Aviation scenarios that build on your recommendations",
      "You decide whether your plan uses AI, and can withdraw consent",
    ],
    href: "/professionals",
    cta: "Find a professional",
  },
  {
    title: "For aviation-psychology professionals",
    points: [
      "A clear profile showing your specialties and languages",
      "One workspace for requests, reviews and reports",
      "You approve exactly what can be used for learning",
    ],
    href: "/sign-up",
    cta: "Join as a professional",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <SampleLabel>Prototype with sample data</SampleLabel>
              <h1 className="mt-5 text-4xl font-semibold sm:text-5xl">
                Aviation psychology, from assessment to development
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                AeroMind connects aspiring and student pilots with aviation-psychology professionals,
                then helps them keep building human-performance skills.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/professionals" size="lg">
                  Find a professional
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </LinkButton>
                <LinkButton href="/sign-in" size="lg" variant="outline">
                  Try the demo
                </LinkButton>
              </div>
            </div>

            <ol className="space-y-5 rounded-xl border bg-background p-6">
              {JOURNEY.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-medium">{step.title}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="rounded-xl border bg-card p-6">
              <pillar.icon aria-hidden="true" className="size-6 text-brand" />
              <h2 className="mt-4 text-lg font-semibold">{pillar.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{pillar.description}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-14 sm:px-6 md:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <article key={audience.title} className="flex flex-col rounded-xl bg-primary p-7 text-primary-foreground">
              <h2 className="text-xl font-semibold">{audience.title}</h2>
              <ul className="mt-4 flex-1 space-y-2.5 text-sm">
                {audience.points.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 opacity-75" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <LinkButton href={audience.href} variant="secondary">
                  {audience.cta}
                </LinkButton>
              </div>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">What AeroMind does not do</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              AeroMind does not issue fitness certificates, diagnose conditions or replace a
              professional&apos;s judgment. Learning activities are educational and do not demonstrate
              psychological fitness.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
