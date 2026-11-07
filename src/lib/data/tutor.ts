import "server-only";
import type { RetrievedChunk, SuggestedLesson, TutorContext, TutorSource } from "@/lib/ai/tutor";
import { asUser } from "@/lib/db";

export type TutorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: TutorSource[];
  suggestedLessons: SuggestedLesson[];
};

export async function getTutorMessages(userId: string, lessonId: string): Promise<TutorMessage[]> {
  const rows = await asUser(userId, (tx) =>
    tx.rows<{
      id: string;
      role: "user" | "assistant";
      content: string;
      sources: TutorSource[];
      suggested_lessons: SuggestedLesson[];
    }>(
      `select m.id, m.role, m.content, m.sources, m.suggested_lessons
       from public.ai_messages m
       join public.ai_conversations c on c.id = m.conversation_id
       where c.user_id = $1 and c.lesson_id = $2
       order by m.created_at, m.role desc
       limit 40`,
      [userId, lessonId],
    ),
  );

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    sources: row.sources,
    suggestedLessons: row.suggested_lessons,
  }));
}

export type TutorPreparation =
  | { status: "ready"; courseId: string; context: TutorContext }
  | { status: "no_access" }
  | { status: "limit_reached" };

/**
 * Loads the lesson the student can read and reserves one request. It runs as the
 * student, so a lesson they cannot read comes back empty. Assessment tables are
 * deliberately never touched here.
 */
export async function prepareTutorRequest(
  userId: string,
  lessonId: string,
  limits: { user: number; global: number },
): Promise<TutorPreparation> {
  return asUser(userId, async (tx) => {
    const lesson = await tx.one<{
      course_id: string;
      course_title: string;
      title: string;
      body: string;
      learning_objectives: string[];
    }>(
      `select c.id as course_id, c.title as course_title, l.title, lc.body, lc.learning_objectives
       from public.lesson_content lc
       join public.lessons l on l.id = lc.lesson_id
       join public.course_modules m on m.id = l.module_id
       join public.courses c on c.id = m.course_id
       where lc.lesson_id = $1`,
      [lessonId],
    );
    if (!lesson) return { status: "no_access" };

    const allowed = await tx.one<{ allowed: boolean }>(
      "select public.reserve_tutor_request($1, $2) as allowed",
      [limits.user, limits.global],
    );
    if (!allowed?.allowed) return { status: "limit_reached" };

    const outline = await tx.rows<SuggestedLesson>(
      `select l.id, l.title
       from public.lessons l
       join public.course_modules m on m.id = l.module_id
       where m.course_id = $1 and l.is_available
       order by m.position, l.position`,
      [lesson.course_id],
    );

    const toReview = await tx.rows<{ title: string }>(
      `select l.title
       from (
         select distinct on (a.lesson_id) a.lesson_id, a.score, a.total
         from public.quiz_attempts a
         where a.user_id = $1
         order by a.lesson_id, a.created_at desc
       ) latest
       join public.lessons l on l.id = latest.lesson_id
       join public.course_modules m on m.id = l.module_id
       where m.course_id = $2 and latest.score::numeric / latest.total < 0.7`,
      [userId, lesson.course_id],
    );

    const history = await tx.rows<{ role: "user" | "assistant"; content: string }>(
      `select recent.role, recent.content
       from (
         select m.role, m.content, m.created_at
         from public.ai_messages m
         join public.ai_conversations c on c.id = m.conversation_id
         where c.user_id = $1 and c.lesson_id = $2
         order by m.created_at desc, m.role
         limit 6
       ) recent
       order by recent.created_at, recent.role desc`,
      [userId, lessonId],
    );

    return {
      status: "ready",
      courseId: lesson.course_id,
      context: {
        lessonId,
        courseTitle: lesson.course_title,
        lessonTitle: lesson.title,
        objectives: lesson.learning_objectives,
        lessonBody: lesson.body,
        outline,
        lessonsToReview: toReview.map((row) => row.title),
        history,
      },
    };
  });
}

/** Passages further away than this were not relevant in testing, so they are dropped. */
const MAX_DISTANCE = 0.75;

export async function retrieveKnowledge(
  userId: string,
  courseId: string,
  embedding: number[],
): Promise<RetrievedChunk[]> {
  return asUser(userId, (tx) =>
    tx.rows<RetrievedChunk>(
      `select content, lesson_id, title, source_name, source_url
       from public.search_knowledge($1::text::extensions.vector, $2, 5)
       where distance < $3`,
      [JSON.stringify(embedding), courseId, MAX_DISTANCE],
    ),
  );
}
