import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Plane, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { EnrollPanel } from "@/components/academy/enroll-panel";
import { CompleteLessonButton } from "@/components/academy/lesson-controls";
import { LessonBody } from "@/components/academy/lesson-body";
import { LessonQuiz } from "@/components/academy/lesson-quiz";
import { TutorPanel } from "@/components/academy/tutor-panel";
import { SampleLabel } from "@/components/brand/sample-label";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { EmptyState, LinkButton, Panel } from "@/components/ui-kit";
import { getAiProvider } from "@/lib/ai/provider";
import { getCurrentProfile } from "@/lib/auth/session";
import { getLesson, recordLessonView } from "@/lib/data/academy";
import { getTutorMessages } from "@/lib/data/tutor";
import { REVIEW_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lesson" };

async function Lesson({ params }: { params: PageProps<"/academy/courses/[slug]/lessons/[lessonId]">["params"] }) {
  await connection();
  const { slug, lessonId } = await params;
  if (!z.uuid().safeParse(lessonId).success) notFound();

  const profile = await getCurrentProfile();
  const detail = await getLesson(slug, lessonId, profile?.id ?? null);
  if (!detail) notFound();

  const { course, lesson, moduleTitle, content, previous, next, quiz, lastScore, completed, scenario, completedIds } =
    detail;
  const courseHref = `/academy/courses/${course.slug}`;
  const isTrainee = profile?.role === "trainee";
  const [tutorMessages] = await Promise.all([
    isTrainee && content ? getTutorMessages(profile.id, lesson.id) : [],
    isTrainee && content && course.enrolled ? recordLessonView(profile.id, lesson.id) : null,
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="min-w-0">
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

            {scenario ? (
              <section className="mt-8 rounded-xl border bg-brand-soft p-5">
                <p className="flex items-center gap-2 text-sm font-medium text-brand">
                  <Plane aria-hidden="true" className="size-4" />
                  Educational simulation
                </p>
                <h2 className="mt-2 font-semibold">{scenario.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{scenario.summary}</p>
                <div className="mt-3">
                  {isTrainee ? (
                    <LinkButton href={`/trainee/scenarios/${scenario.id}`}>Start the scenario</LinkButton>
                  ) : (
                    <p className="text-sm text-muted-foreground">Scenarios are available on trainee accounts.</p>
                  )}
                </div>
              </section>
            ) : null}

            {quiz.length > 0 ? (
              <div className="mt-8">
                <LessonQuiz lessonId={lesson.id} questions={quiz} canSubmit={isTrainee} lastScore={lastScore} />
              </div>
            ) : null}

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

            {isTrainee && course.enrolled ? (
              <div className="mt-8">
                <CompleteLessonButton lessonId={lesson.id} completed={completed} />
              </div>
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

      <aside className="min-w-0 space-y-4">
        {isTrainee && content ? (
          <div className="lg:sticky lg:top-6">
            <TutorPanel
              key={lesson.id}
              lessonId={lesson.id}
              courseSlug={course.slug}
              connected={Boolean(getAiProvider())}
              initialMessages={tutorMessages}
            />
          </div>
        ) : !profile ? (
          <Panel title="AI tutor" description="Sign in with a trainee account to ask questions about this lesson.">
            <LinkButton href="/sign-in" variant="outline" className="w-full">
              Sign in
            </LinkButton>
          </Panel>
        ) : null}

        <Panel title="Course content">
          <div className="space-y-4">
            {course.modules.map((module) => (
              <section key={module.id}>
                <h3 className="text-sm font-medium">{module.title}</h3>
                <ul className="mt-1">
                  {module.lessons.map((item) => {
                    const done = completedIds.has(item.id);
                    const label = (
                      <>
                        {done ? (
                          <CheckCircle2 aria-label="Completed" className="mt-0.5 size-4 shrink-0 text-brand" />
                        ) : (
                          <span aria-hidden="true" className="size-4 shrink-0" />
                        )}
                        {item.title}
                      </>
                    );
                    const className = cn(
                      "flex gap-1.5 rounded-md px-1.5 py-1 text-sm",
                      item.id === lesson.id ? "bg-brand-soft font-medium" : "text-muted-foreground",
                    );

                    return (
                      <li key={item.id}>
                        {item.is_available ? (
                          <Link
                            href={`${courseHref}/lessons/${item.id}`}
                            aria-current={item.id === lesson.id ? "page" : undefined}
                            className={cn(className, "hover:text-foreground")}
                          >
                            {label}
                          </Link>
                        ) : (
                          <span className={cn(className, "opacity-60")}>{label}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </Panel>
      </aside>
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
