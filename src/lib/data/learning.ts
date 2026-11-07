import "server-only";
import { type CourseSummary, COURSE_SUMMARY_SELECT, type Resource, RESOURCE_SELECT } from "@/lib/data/academy";
import { asUser } from "@/lib/db";

export type EnrolledCourse = {
  id: string;
  slug: string;
  title: string;
  category: string;
  available_lessons: number;
  completed_lessons: number;
  next_lesson_id: string | null;
  next_lesson_title: string | null;
};

export type RecentLesson = {
  lesson_id: string;
  lesson_title: string;
  course_slug: string;
  course_title: string;
  last_viewed_at: Date;
  completed_at: Date | null;
};

export type QuizResult = {
  id: string;
  lesson_id: string;
  lesson_title: string;
  course_slug: string;
  score: number;
  total: number;
  created_at: Date;
};

export type LearningDashboard = {
  courses: EnrolledCourse[];
  recent: RecentLesson[];
  quizzes: QuizResult[];
  saved: Resource[];
  recommended: CourseSummary[];
  activeDaysThisWeek: number;
};

export async function getLearningDashboard(userId: string): Promise<LearningDashboard> {
  return asUser(userId, async (tx) => {
    const [courses, recent, quizzes, saved, recommended, activity] = await Promise.all([
      tx.rows<EnrolledCourse>(
      `select c.id, c.slug, c.title, c.category,
         (select count(*)::int
          from public.lessons l
          join public.course_modules m on m.id = l.module_id
          where m.course_id = c.id and l.is_available) as available_lessons,
         (select count(*)::int
          from public.lesson_progress p
          join public.lessons l on l.id = p.lesson_id
          join public.course_modules m on m.id = l.module_id
          where m.course_id = c.id and p.user_id = $1 and p.completed_at is not null) as completed_lessons,
         next.id as next_lesson_id,
         next.title as next_lesson_title
       from public.course_enrollments e
       join public.courses c on c.id = e.course_id
       left join lateral (
         select l.id, l.title
         from public.lessons l
         join public.course_modules m on m.id = l.module_id
         left join public.lesson_progress p on p.lesson_id = l.id and p.user_id = $1
         where m.course_id = c.id and l.is_available and p.completed_at is null
         order by m.position, l.position
         limit 1
       ) next on true
       where e.user_id = $1
       order by e.enrolled_at desc`,
      [userId],
      ),
      tx.rows<RecentLesson>(
      `select p.lesson_id, l.title as lesson_title, c.slug as course_slug, c.title as course_title,
         p.last_viewed_at, p.completed_at
       from public.lesson_progress p
       join public.lessons l on l.id = p.lesson_id
       join public.course_modules m on m.id = l.module_id
       join public.courses c on c.id = m.course_id
       where p.user_id = $1
       order by p.last_viewed_at desc
       limit 5`,
      [userId],
      ),
      tx.rows<QuizResult>(
      `select a.id, a.lesson_id, l.title as lesson_title, c.slug as course_slug,
         a.score, a.total, a.created_at
       from public.quiz_attempts a
       join public.lessons l on l.id = a.lesson_id
       join public.course_modules m on m.id = l.module_id
       join public.courses c on c.id = m.course_id
       where a.user_id = $1
       order by a.created_at desc
       limit 5`,
      [userId],
      ),
      tx.rows<Resource>(
      `${RESOURCE_SELECT}
       join public.saved_resources s on s.resource_id = r.id
       where s.user_id = $1
       order by s.created_at desc`,
      [userId],
      ),
      // Competencies stay on this page and are never sent to the learning tutor.
      tx.rows<CourseSummary>(
      `${COURSE_SUMMARY_SELECT}
       where not exists (
         select 1 from public.course_enrollments e where e.course_id = c.id and e.user_id = $1
       )
       order by
         exists (
           select 1
           from public.development_plans p
           join public.development_plan_sources s on s.plan_id = p.id
           join public.professional_recommendations r on r.id = s.recommendation_id
           where p.trainee_id = $1 and r.competency = any (c.competencies)
         ) desc,
         c.featured desc,
         c.title
       limit 2`,
      [userId],
      ),
      tx.one<{ days: number }>(
      `select count(distinct day)::int as days
       from (
         select last_viewed_at::date as day from public.lesson_progress
         where user_id = $1 and last_viewed_at > now() - interval '7 days'
         union
         select created_at::date from public.quiz_attempts
         where user_id = $1 and created_at > now() - interval '7 days'
       ) days`,
      [userId],
      ),
    ]);

    return { courses, recent, quizzes, saved, recommended, activeDaysThisWeek: activity?.days ?? 0 };
  });
}

export async function listSavedResourceIds(userId: string): Promise<Set<string>> {
  const rows = await asUser(userId, (tx) =>
    tx.rows<{ resource_id: string }>("select resource_id from public.saved_resources where user_id = $1", [userId]),
  );
  return new Set(rows.map(({ resource_id }) => resource_id));
}
