import { ArrowLeft, ArrowRight, ExternalLink, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { EnrollPanel } from "@/components/academy/enroll-panel";
import { LessonBody } from "@/components/academy/lesson-body";
import { SampleLabel } from "@/components/brand/sample-label";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { EmptyState, LinkButton, Panel } from "@/components/ui-kit";
import { getSessionUserId } from "@/lib/auth/session";
import { getLesson } from "@/lib/data/academy";
import { REVIEW_STATUS_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Lesson" };

async function Lesson({ params }: { params: PageProps<"/academy/courses/[slug]/lessons/[lessonId]">["params"] }) {
  await connection();
  const { slug, lessonId } = await params;
  if (!z.uuid().safeParse(lessonId).success) notFound();

  const userId = await getSessionUserId();
  const detail = await getLesson(slug, lessonId, userId);
  if (!detail) notFound();

  const { course, lesson, moduleTitle, content, previous, next } = detail;
  const courseHref = `/academy/courses/${course.slug}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={courseHref} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
        {course.title}
      </Link>
      <p className="mt-1 text-sm text-muted-foreground">{moduleTitle}</p>
      <h1 className="mt-2 text-3xl font-semibold">{lesson.title}</h1>
      <div className="mt-3">
        <SampleLabel>{REVIEW_STATUS_LABELS[course.review_status]}</SampleLabel>
      </div>

      {content ? (
        <>
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
            <Video aria-hidden="true" className="size-5 shrink-0" />
            No video has been recorded for this lesson yet.
          </div>

          {content.learning_objectives.length > 0 ? (
            <Panel title="Learning objectives" className="mt-6">
              <ul className="list-disc space-y-1 pl-5">
                {content.learning_objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <article className="mt-6">
            <LessonBody body={content.body} />
          </article>

          {content.references_list.length > 0 ? (
            <Panel title="References and further reading" className="mt-8">
              <ul className="space-y-3">
                {content.references_list.map((reference) => (
                  <li key={reference.url}>
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-start gap-1.5 font-medium text-brand underline-offset-4 hover:underline"
                    >
                      {reference.title}
                      <ExternalLink aria-hidden="true" className="mt-1 size-4 shrink-0" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                    <p className="text-sm text-muted-foreground">{reference.publisher}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </>
      ) : lesson.is_available ? (
        <Panel title="Enrol to read this lesson" className="mt-6" description="This lesson is for enrolled students.">
          <Suspense>
            <EnrollPanel courseId={course.id} enrolled={course.enrolled} />
          </Suspense>
        </Panel>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="This lesson is in development"
            description="It will open here once it has been written."
            action={
              <LinkButton href={courseHref} variant="outline">
                Back to the course
              </LinkButton>
            }
          />
        </div>
      )}

      <nav aria-label="Lessons" className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        {previous ? (
          <LinkButton href={`${courseHref}/lessons/${previous.id}`} variant="outline">
            <ArrowLeft aria-hidden="true" />
            Previous lesson
          </LinkButton>
        ) : (
          <span />
        )}
        {next ? (
          <LinkButton href={`${courseHref}/lessons/${next.id}`}>
            Next lesson
            <ArrowRight aria-hidden="true" />
          </LinkButton>
        ) : null}
      </nav>
    </div>
  );
}

export default function LessonPage(props: PageProps<"/academy/courses/[slug]/lessons/[lessonId]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<PageSkeleton />}>
          <Lesson params={props.params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
