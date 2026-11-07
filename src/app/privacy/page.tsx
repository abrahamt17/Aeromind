import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";

export const metadata: Metadata = { title: "Privacy notice" };

const SECTIONS = [
  {
    title: "This is a prototype",
    body: "AeroMind is a competition prototype that uses synthetic data. Please do not enter real health, psychological or other sensitive information. All professionals, questionnaires and reports are samples.",
  },
  {
    title: "What we store",
    body: "We store your account email, name, role and the information you add while using the prototype.",
  },
  {
    title: "AI features",
    body: "With your consent, AeroMind sends recommendations your professional has approved for educational use, your training stage and your language to an AI provider. Names, emails, questionnaire answers, reports and private professional notes are never sent. You can withdraw this consent at any time.",
  },
  {
    title: "Who can see your information",
    body: "Your assigned professional can see the requests and questionnaire answers you share with them. Reports appear to you once your professional releases them. Private professional notes are visible only to that professional.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-16">
        <h1 className="text-3xl font-semibold">Privacy notice</h1>
        <p className="mt-2 text-muted-foreground">
          Prototype notice. This has not had a legal review and must be replaced before real users join.
        </p>
        <div className="mt-8 space-y-7">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-1.5 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
