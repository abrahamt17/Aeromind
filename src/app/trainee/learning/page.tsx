import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CourseGrid } from "@/components/academy/course-card";
import { SaveResourceButton } from "@/components/academy/lesson-controls";
import { ResourceCard } from "@/components/academy/resource-card";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { EmptyState, LinkButton, PageHeader, Panel } from "@/components/ui-kit";
import { requireRole } from "@/lib/auth/session";
import { getDevelopment } from "@/lib/data/development";
import { getLearningDashboard } from "@/lib/data/learning";
import { formatDate } from "@/lib/labels";

export const metadata: Metadata = { title: "My learning" };

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
    </div>
  );
}

async function Learning() {
  const user = await requireRole("trainee");
  const [learning, development] = [await getLearningDashboard(user.id), await getDevelopment(user.id)];
  const planItems = development.flatMap((entry) => entry.plan?.items ?? []);
  const openPlanItems = planItems.filter((item) => !item.completed_at);
  const lessonsCompleted = learning.courses.reduce((total, course) => total + course.completed_lessons, 0);

  return (
    <>
      <PageHeader
        title="My learning"
        description="Your courses, quiz results and saved resources. This tracks learning activity, not psychological fitness."
        action={<LinkButton href="/academy">Browse the Academy</LinkButton>}
      />

      <dl className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Lessons completed", value: lessonsCompleted },
          { label: "Quizzes taken recently", value: learning.quizzes.length },
          { label: "Active days this week", value: learning.activeDaysThisWeek },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Your courses</h2>
            {learning.courses.length === 0 ? (
              <EmptyState
                title="You are not enrolled in a course yet"
                description="Enrol in a course and your progress will appear here."
                action={<LinkButton href="/academy">Browse courses</LinkButton>}
              />
            ) : (
              <ul className="space-y-3">
                {learning.courses.map((course) => {
                  const percent = course.available_lessons
                    ? Math.round((course.completed_lessons / course.available_lessons) * 100)
                    : 0;
                  return (
                    <li key={course.id} className="rounded-xl border bg-card p-5">
                      <p className="text-sm text-muted-foreground">{course.category}</p>
                      <Link
                        href={`/academy/courses/${course.slug}`}
                        className="mt-1 block font-semibold underline-offset-4 hover:underline"
                      >
                        {course.title}
                      </Link>
                      <p className="mb-2 mt-3 text-sm text-muted-foreground">
                        {course.completed_lessons} of {course.available_lessons} available lessons completed ({percent}%)
                      </p>
                      <ProgressBar label={`${course.title} progress`} value={percent} />
                      <div className="mt-4">
                        {course.next_lesson_id ? (
                          <LinkButton href={`/academy/courses/${course.slug}/lessons/${course.next_lesson_id}`}>
                            Next: {course.next_lesson_title}
                          </LinkButton>
                        ) : (
                          <p className="flex items-center gap-1.5 text-sm font-medium text-brand">
                            <CheckCircle2 aria-hidden="true" className="size-4" />
                            All available lessons completed
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {learning.recommended.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold">Recommended next</h2>
              <p className="mb-3 mt-1 text-sm text-muted-foreground">
                Chosen from your development plan topics first, then featured courses.
              </p>
              <CourseGrid courses={learning.recommended} />
            </section>
          ) : null}

          {learning.saved.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Saved resources</h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {learning.saved.map((resource) => (
                  <li key={resource.id}>
                    <ResourceCard
                      resource={resource}
                      action={<SaveResourceButton resourceId={resource.id} saved />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-5">
          <Panel title="Development plan">
            {planItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Activities appear here after your professional releases a report.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {openPlanItems.length === 0
                  ? "All plan activities are complete."
                  : `${openPlanItems.length} of ${planItems.length} activities still to do.`}
              </p>
            )}
            <div className="mt-3">
              <LinkButton href="/trainee/development" variant="outline" className="w-full">
                Open development plan
              </LinkButton>
            </div>
          </Panel>

          <Panel title="Recently viewed">
            {learning.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Lessons you open will appear here.</p>
            ) : (
              <ul className="space-y-3">
                {learning.recent.map((lesson) => (
                  <li key={lesson.lesson_id}>
                    <Link
                      href={`/academy/courses/${lesson.course_slug}/lessons/${lesson.lesson_id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {lesson.lesson_title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {lesson.course_title}, {formatDate(lesson.last_viewed_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Quiz results" description="Knowledge checks only. They do not measure fitness.">
            {learning.quizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your results will appear here.</p>
            ) : (
              <ul className="space-y-3">
                {learning.quizzes.map((quiz) => (
                  <li key={quiz.id}>
                    <Link
                      href={`/academy/courses/${quiz.course_slug}/lessons/${quiz.lesson_id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {quiz.lesson_title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {quiz.score} of {quiz.total}, {formatDate(quiz.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}

export default function LearningPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Learning />
    </Suspense>
  );
}
