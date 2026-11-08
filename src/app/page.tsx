import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";
import { FlightPath } from "@/components/brand/flight-path";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { Eyebrow, LinkButton } from "@/components/ui-kit";

const STATS = [
  { value: "119,000", label: "new pilots Europe and CIS need by 2043", source: "Airbus Global Services Forecast" },
  { value: "€80k–180k", label: "the cost of integrated pilot training in Europe", source: "European training cost guides, 2026" },
  { value: "Since 2021", label: "EU airlines must psychologically assess pilots before line flying", source: "EASA, Regulation (EU) 2018/1042" },
];

const JOURNEY = [
  { title: "Find a professional", description: "Compare aviation psychologists by specialty, language and format." },
  { title: "Request a review", description: "Share your request and complete a short self-reflection, with consent." },
  { title: "Receive feedback", description: "Your professional reviews it and releases a report with recommendations." },
  { title: "Keep developing", description: "Approved recommendations become lessons, scenarios and an AI-guided plan." },
];

const PILLARS = [
  {
    icon: UserRoundSearch,
    title: "Professional marketplace",
    description: "Discover aviation psychologists and understand their background before you request anything.",
    href: "/professionals",
    cta: "Browse professionals",
  },
  {
    icon: GraduationCap,
    title: "AeroMind Academy",
    description: "Courses on stress, decisions, fatigue and bias, with quizzes, scenarios and tracked progress.",
    href: "/academy",
    cta: "Explore the Academy",
  },
  {
    icon: Sparkles,
    title: "AI learning companion",
    description: "A tutor that answers from the course with sources, and plans built only from approved recommendations.",
    href: "/sign-in",
    cta: "Try the demo",
  },
];

const COURSES = [
  { slug: "stress-management-in-aviation", title: "Stress Management in Aviation", meta: "AeroMind Original · 9 lessons" },
  { slug: "aeronautical-decision-making", title: "Aeronautical Decision-Making", meta: "AeroMind Original" },
  { slug: "fatigue-and-sleep-management", title: "Fatigue and Sleep Management", meta: "Expert course · demo" },
  { slug: "cognitive-biases-in-aviation", title: "Cognitive Biases in Aviation", meta: "Expert course · demo" },
];

const AUDIENCES = [
  {
    title: "For aspiring and student pilots",
    points: [
      "Professional feedback before the airline assessment",
      "Lessons and scenarios built on your recommendations",
      "You decide whether AI is used, and can withdraw consent",
    ],
    href: "/sign-up",
    cta: "Start as a trainee",
  },
  {
    title: "For aviation psychologists",
    points: [
      "A clear profile showing your specialties and languages",
      "One workspace for requests, reviews and reports",
      "You approve exactly what can be used for learning",
    ],
    href: "/sign-up",
    cta: "Join as a professional",
  },
];

function ProductPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="rounded-3xl border border-white/10 bg-white p-6 text-foreground shadow-2xl shadow-black/30 sm:pb-24">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.16em] text-brand uppercase">Development plan</p>
          <span className="rounded-full bg-sample-soft px-2.5 py-0.5 text-xs font-medium text-sample">Sample</span>
        </div>
        <p className="mt-3 font-heading text-xl font-bold">Planning ahead for busy phases</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-3/5 rounded-full bg-brand" />
          </div>
          <span className="text-sm font-semibold">60%</span>
        </div>
        <ul className="mt-5 space-y-3 text-sm">
          {[
            { label: "Workload and busy phases of flight", done: true },
            { label: "Busy circuit: educational simulation", done: true },
            { label: "Reflect on your priority order", done: false },
          ].map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <CheckCircle2 aria-hidden="true" className={item.done ? "size-5 text-brand" : "size-5 text-input"} />
              <span className={item.done ? "text-muted-foreground line-through" : "font-medium"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -right-3 -bottom-12 hidden w-72 rounded-2xl border border-white/10 bg-navy-soft p-4 text-primary-foreground shadow-xl shadow-black/30 sm:block lg:-right-8">
        <p className="flex items-center gap-2 text-xs font-semibold text-sky">
          <MessageCircleQuestion aria-hidden="true" className="size-4" />
          AI tutor
        </p>
        <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-sm">How does stress affect decisions?</p>
        <p className="mt-2 text-sm leading-relaxed text-[#dce4f2]">
          Under pressure, attention narrows and we consider fewer options…
        </p>
      </div>
      <figcaption className="sr-only">Example screens with sample data</figcaption>
    </figure>
  );
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-navy text-primary-foreground">
          <FlightPath />
          <div className="relative mx-auto grid max-w-6xl gap-16 px-4 pt-16 pb-24 sm:px-6 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-28">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-[#dce4f2]">
                <span className="size-1.5 rounded-full bg-warm" />
                Prototype with sample data
              </p>
              <h1 className="mt-6 text-4xl leading-[1.05] font-bold sm:text-6xl">
                From assessment to development, for the next generation of pilots.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#b9c6dd]">
                AeroMind connects aspiring and student pilots with aviation psychologists, then turns their
                professional feedback into a personal learning plan.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/academy" size="lg" className="rounded-full bg-white px-6 text-navy hover:bg-white/90">
                  Explore the Academy
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </LinkButton>
                <LinkButton
                  href="/sign-in"
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/25 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  Try the live demo
                </LinkButton>
              </div>
              <p className="mt-8 font-heading text-sm font-semibold text-warm">Learn to fly, make it high.</p>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section aria-label="Why it matters" className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
          <dl className="grid overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_20px_50px_-24px_rgba(15,30,58,0.25)] md:grid-cols-3">
            {STATS.map((stat, index) => (
              <div key={stat.value} className={index > 0 ? "border-t p-7 md:border-t-0 md:border-l" : "p-7"}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-heading text-3xl font-bold text-foreground sm:text-4xl">{stat.value}</dd>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{stat.label}</dd>
                <dd className="mt-3 text-xs text-muted-foreground/80">{stat.source}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">One continuous journey, guided by a professional</h2>
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
            {JOURNEY.map((step, index) => (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-navy font-heading text-base font-bold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {index < JOURNEY.length - 1 ? (
                    <span aria-hidden="true" className="hidden h-px flex-1 border-t-2 border-dashed border-input md:block" />
                  ) : null}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-card py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <Eyebrow>The platform</Eyebrow>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Three connected parts, one place to grow</h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {PILLARS.map((pillar, index) => (
                <article
                  key={pillar.title}
                  className={
                    index === 2
                      ? "flex flex-col rounded-3xl bg-navy p-8 text-primary-foreground"
                      : "flex flex-col rounded-3xl border border-border/80 bg-background p-8"
                  }
                >
                  <span
                    className={
                      index === 2
                        ? "flex size-12 items-center justify-center rounded-2xl bg-warm/15"
                        : "flex size-12 items-center justify-center rounded-2xl bg-brand-soft"
                    }
                  >
                    <pillar.icon aria-hidden="true" className={index === 2 ? "size-6 text-warm" : "size-6 text-brand"} />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold">{pillar.title}</h3>
                  <p className={index === 2 ? "mt-3 flex-1 text-sm leading-relaxed text-[#b9c6dd]" : "mt-3 flex-1 text-sm leading-relaxed text-muted-foreground"}>
                    {pillar.description}
                  </p>
                  <Link
                    href={pillar.href}
                    className={
                      index === 2
                        ? "mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-sky hover:text-white"
                        : "mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-navy"
                    }
                  >
                    {pillar.cta}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <Eyebrow>AeroMind Academy</Eyebrow>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Learn the human side of flying</h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                Short, practical lessons on stress, workload, decisions and fatigue, with knowledge checks and an
                AI tutor that cites the course. Preview lessons are open to everyone.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton href="/academy" size="lg" className="rounded-full px-6">
                  Browse courses
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </LinkButton>
                <LinkButton href="/academy/resources" size="lg" variant="outline" className="rounded-full px-6">
                  Learning resources
                </LinkButton>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {COURSES.map((course, index) => (
                <li key={course.slug}>
                  <Link
                    href={`/academy/courses/${course.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(15,30,58,0.35)]"
                  >
                    <div className={index % 2 === 0 ? "relative h-24 bg-navy" : "relative h-24 bg-brand"}>
                      <BookOpenCheck aria-hidden="true" className="absolute right-5 bottom-4 size-7 text-white/70" />
                      <span aria-hidden="true" className="absolute top-5 left-5 size-2 rounded-full bg-warm" />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-xs text-muted-foreground">{course.meta}</p>
                      <h3 className="mt-1.5 font-semibold group-hover:text-brand">{course.title}</h3>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-24 sm:px-6 md:grid-cols-2">
          {AUDIENCES.map((audience, index) => (
            <article
              key={audience.title}
              className={
                index === 0
                  ? "flex flex-col rounded-3xl bg-brand p-8 text-white"
                  : "flex flex-col rounded-3xl bg-navy p-8 text-primary-foreground"
              }
            >
              <h2 className="text-2xl font-bold">{audience.title}</h2>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {audience.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-white/80" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <LinkButton href={audience.href} size="lg" className="rounded-full bg-white px-6 text-navy hover:bg-white/90">
                  {audience.cta}
                </LinkButton>
              </div>
            </article>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="flex flex-col gap-6 rounded-3xl border border-border/80 bg-card p-8 sm:flex-row sm:items-center">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
              <ShieldCheck aria-hidden="true" className="size-7 text-brand" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Professionals decide. AeroMind never certifies.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                AeroMind does not issue licences or fitness certificates, diagnose conditions or replace a
                professional&apos;s judgment. Learning activities are educational, data stays in the EU, and the AI
                only ever sees summaries a professional approved.
              </p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-navy text-primary-foreground">
          <FlightPath />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold sm:text-5xl">Learn to fly, make it high.</h2>
              <p className="mt-4 max-w-xl text-[#b9c6dd]">
                Try the full journey with a demo account, as a trainee or a psychologist. No password needed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/sign-in" size="lg" className="rounded-full bg-warm px-6 text-navy hover:bg-warm/90">
                Try the live demo
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </LinkButton>
              <LinkButton
                href="/professionals"
                size="lg"
                variant="outline"
                className="rounded-full border-white/25 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
              >
                <ClipboardList aria-hidden="true" data-icon="inline-start" />
                Find a professional
              </LinkButton>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
