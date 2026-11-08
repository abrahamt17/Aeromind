import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EnrollPanel } from "@/components/academy/enroll-panel";
import { ResourceCard } from "@/components/academy/resource-card";
import { SampleLabel } from "@/components/brand/sample-label";
import { WelcomeBanner } from "@/components/dashboard";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { Panel } from "@/components/ui-kit";
import { getSessionUserId } from "@/lib/auth/session";
import { getCourse, type LessonOutline } from "@/lib/data/academy";
import {
  COURSE_KIND_LABELS,
  COURSE_LEVEL_LABELS,
  formatDuration,
  REVIEW_STATUS_LABELS,
  VERIFICATION_LABELS,
} from "@/lib/labels";

export const metadata: Metadata = { title: "Course" };

function LessonRow({ slug, lesson, enrolled }: { slug: string; lesson: LessonOutline; enrolled: boolean }) {
  const open = lesson.is_available && (lesson.is_preview || enrolled);
  const inner = (
    <>
        {open ? (
          <PlayCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
        ) : (
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{lesson.title}</span>
          <span className="block text-sm text-muted-foreground">{lesson.summary}</span>
        </span>
        <span className="shrink-0 text-right text-sm text-muted-foreground">
          {lesson.is_available
            ? lesson.is_preview
              ? "Free preview"
              : `${lesson.duration_minutes} min`
            : "In development"}
        </span>
    </>
  );

  return (
    <li>
      {lesson.is_available ? (
        <Link href={`/academy/courses/${slug}/lessons/${lesson.id}`} className="flex gap-3 p-3 hover:bg-muted">
          {inner}
        </Link>
      ) : (
        <div className="flex gap-3 p-3 opacity-75">{inner}</div>
      )}
    </li>
  );
}

async function Course({ params }: { params: PageProps<"/academy/courses/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const userId = await getSessionUserId();
  const course = await getCourse(slug, userId);
  if (!course) notFound();

  return (
    <>
    <WelcomeBanner
      eyebrow={COURSE_KIND_LABELS[course.kind]}
      title={course.title}
      description={course.summary}
      actions={
        <>
          {[
            course.category,
            COURSE_LEVEL_LABELS[course.level],
            formatDuration(course.duration_minutes),
            `${course.lesson_count} lessons`,
          ].map((fact) => (
            <span key={fact} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-[#dce4f2]">
              {fact}
            </span>
          ))}
          {course.is_sample ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-warm/15 px-3 py-1 text-sm text-warm">
              <span className="size-1.5 rounded-full bg-warm" />
              Demo content
            </span>
          ) : null}
        </>
      }
    />
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="min-w-0 space-y-6">

        <Panel title="About this course">
          <p>{course.description}</p>
          <h3 className="mt-5 font-medium">Who it is for</h3>
          <p className="mt-1 text-muted-foreground">{course.audience}</p>
          <h3 className="mt-5 font-medium">What you will learn</h3>
          <ul className="mt-2 space-y-2">
            {course.learning_objectives.map((objective) => (
              <li key={objective} className="flex gap-2">
                <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand" />
                {objective}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Course content">
          <div className="space-y-5">
            {course.modules.map((module, index) => (
              <section key={module.id}>
                <h3 className="font-medium">
                  Module {index + 1}: {module.title}
                </h3>
                <p className="text-sm text-muted-foreground">{module.summary}</p>
                <ul className="mt-2 divide-y rounded-lg border">
                  {module.lessons.map((lesson) => (
                    <LessonRow key={lesson.id} slug={course.slug} lesson={lesson} enrolled={course.enrolled} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Panel>

        {course.resources.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold">Resources</h2>
            <ul className="mt-3 grid gap-4 md:grid-cols-2">
              {course.resources.map((resource) => (
                <li key={resource.id}>
                  <ResourceCard resource={resource} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Panel>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">{formatDuration(course.duration_minutes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lessons</dt>
              <dd className="font-medium">{course.lesson_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Level</dt>
              <dd className="font-medium">{COURSE_LEVEL_LABELS[course.level]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Content status</dt>
              <dd className="font-medium">{REVIEW_STATUS_LABELS[course.review_status]}</dd>
            </div>
          </dl>
          <div className="mt-4 border-t pt-4">
            <Suspense>
              <EnrollPanel courseId={course.id} enrolled={course.enrolled} />
            </Suspense>
          </div>
        </Panel>

        <Panel title="Instructor">
          {course.instructor ? (
            <>
              <Link
                href={`/academy/instructors/${course.instructor.slug}`}
                className="font-medium text-brand underline-offset-4 hover:underline"
              >
                {course.instructor.display_name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{course.instructor.title}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {course.instructor.is_sample ? <SampleLabel>Fictional instructor</SampleLabel> : null}
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {VERIFICATION_LABELS[course.instructor.verification_status]}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Created by AeroMind from published aviation sources.</p>
          )}
        </Panel>
      </aside>
    </div>
    </>
  );
}

export default function CoursePage(props: PageProps<"/academy/courses/[slug]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<PageSkeleton />}>
          <Course params={props.params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
