import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CourseGrid } from "@/components/academy/course-card";
import { SampleLabel } from "@/components/brand/sample-label";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { Panel } from "@/components/ui-kit";
import { getInstructor } from "@/lib/data/academy";
import { VERIFICATION_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Instructor" };

function initials(name: string): string {
  return name
    .replace(/\(.*\)/, "")
    .split(/\s+/)
    .filter((word) => word && word !== "Dr")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}

async function Instructor({ params }: { params: PageProps<"/academy/instructors/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const instructor = await getInstructor(slug);
  if (!instructor) notFound();

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          aria-hidden="true"
          className="flex size-20 shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xl font-semibold text-brand"
        >
          {initials(instructor.display_name)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {instructor.is_sample ? <SampleLabel>Fictional instructor</SampleLabel> : null}
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {VERIFICATION_LABELS[instructor.verification_status]}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold">{instructor.display_name}</h1>
          <p className="mt-1 text-muted-foreground">{instructor.title}</p>
        </div>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Panel title="About">
          <p>{instructor.bio}</p>
          {instructor.experience ? <p className="mt-3 text-muted-foreground">{instructor.experience}</p> : null}
        </Panel>
        <Panel title="Qualifications and expertise">
          <ul className="list-disc space-y-1 pl-5">
            {instructor.qualifications.map((qualification) => (
              <li key={qualification}>{qualification}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {instructor.expertise.map((area) => (
              <span key={area} className="rounded-full bg-muted px-2.5 py-0.5 text-sm">
                {area}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Courses</h2>
        <CourseGrid courses={instructor.courses} />
      </section>
    </>
  );
}

export default function InstructorPage(props: PageProps<"/academy/instructors/[slug]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<PageSkeleton />}>
          <Instructor params={props.params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
