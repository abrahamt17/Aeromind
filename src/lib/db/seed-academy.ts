import { LESSON_EXTRAS } from "@/lib/demo/academy-lessons";
import { DEMO_COURSES, DEMO_INSTRUCTORS, DEMO_RESOURCES } from "@/lib/demo/academy";
import { WORKLOAD_SCENARIO, WORKLOAD_SCENARIO_LESSON } from "@/lib/demo/data";
import type { SeedDatabase } from "@/lib/db/seed";
import { scenarioContentSchema } from "@/lib/schemas/scenario";

const ACADEMY_SEED_LOCK_ID = 7_204_119;

/** Increase this when demo catalogue content changes, so existing databases update. */
export const ACADEMY_CONTENT_VERSION = 2;

/**
 * Brings the demo catalogue up to date. Rows are matched on stable keys, so lesson
 * ids stay the same and enrolments and progress survive. Run it inside a transaction.
 */
export async function seedAcademy(db: SeedDatabase): Promise<void> {
  await db.query(`select pg_advisory_xact_lock(${ACADEMY_SEED_LOCK_ID})`);
  const { rows: state } = await db.query<{ version: number }>(
    "select version from app_private.seed_state where name = 'academy'",
  );
  if (state[0] && state[0].version >= ACADEMY_CONTENT_VERSION) return;

  const instructorIds = new Map<string, string>();
  for (const instructor of DEMO_INSTRUCTORS) {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.instructor_profiles (
         slug, display_name, title, bio, experience, qualifications, expertise,
         verification_status, is_sample, published
       )
       values ($1, $2, $3, $4, $5, $6, $7, 'unverified', true, true)
       on conflict (slug) do update set
         display_name = excluded.display_name, title = excluded.title, bio = excluded.bio,
         experience = excluded.experience, qualifications = excluded.qualifications,
         expertise = excluded.expertise
       returning id`,
      [
        instructor.slug,
        instructor.displayName,
        instructor.title,
        instructor.bio,
        instructor.experience,
        instructor.qualifications,
        instructor.expertise,
      ],
    );
    instructorIds.set(instructor.slug, rows[0].id);
  }

  const courseIds = new Map<string, string>();
  const lessonIds = new Map<string, string>();

  for (const course of DEMO_COURSES) {
    const lessons = course.modules.flatMap((module) => module.lessons);
    const { rows } = await db.query<{ id: string }>(
      `insert into public.courses (
         slug, kind, instructor_id, title, summary, description, category, competencies,
         level, audience, learning_objectives, duration_minutes, review_status,
         is_sample, featured, published
       )
       values (
         $1, $2, $3, $4, $5, $6, $7, $8::text[]::public.competency[], $9, $10, $11, $12,
         'awaiting_professional_review', true, $13, true
       )
       on conflict (slug) do update set
         kind = excluded.kind, instructor_id = excluded.instructor_id, title = excluded.title,
         summary = excluded.summary, description = excluded.description,
         category = excluded.category, competencies = excluded.competencies,
         level = excluded.level, audience = excluded.audience,
         learning_objectives = excluded.learning_objectives,
         duration_minutes = excluded.duration_minutes, featured = excluded.featured
       returning id`,
      [
        course.slug,
        course.kind,
        course.instructorSlug ? instructorIds.get(course.instructorSlug) : null,
        course.title,
        course.summary,
        course.description,
        course.category,
        course.competencies,
        course.level,
        course.audience,
        course.objectives,
        lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0),
        course.featured,
      ],
    );
    const courseId = rows[0].id;
    courseIds.set(course.slug, courseId);

    for (const [modulePosition, module] of course.modules.entries()) {
      const { rows: moduleRows } = await db.query<{ id: string }>(
        `insert into public.course_modules (course_id, position, title, summary)
         values ($1, $2, $3, $4)
         on conflict (course_id, position) do update set
           title = excluded.title, summary = excluded.summary
         returning id`,
        [courseId, modulePosition, module.title, module.summary],
      );

      for (const [lessonPosition, lesson] of module.lessons.entries()) {
        const extra = LESSON_EXTRAS[lesson.title];
        const content = lesson.content ?? extra?.content;

        const { rows: lessonRows } = await db.query<{ id: string }>(
          `insert into public.lessons (
             module_id, position, title, summary, duration_minutes, is_preview, is_available
           )
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (module_id, position) do update set
             title = excluded.title, summary = excluded.summary,
             duration_minutes = excluded.duration_minutes, is_preview = excluded.is_preview,
             is_available = excluded.is_available
           returning id`,
          [
            moduleRows[0].id,
            lessonPosition,
            lesson.title,
            lesson.summary,
            lesson.durationMinutes,
            Boolean(lesson.isPreview),
            Boolean(content),
          ],
        );
        const lessonId = lessonRows[0].id;
        lessonIds.set(lesson.title, lessonId);

        if (content) {
          await db.query(
            `insert into public.lesson_content (lesson_id, body, learning_objectives, references_list)
             values ($1, $2, $3, $4)
             on conflict (lesson_id) do update set
               body = excluded.body, learning_objectives = excluded.learning_objectives,
               references_list = excluded.references_list`,
            [lessonId, content.body, content.objectives, JSON.stringify(content.references)],
          );
        }

        // Past attempts keep their answers and score, so questions can be replaced.
        await db.query("delete from public.quiz_questions where lesson_id = $1", [lessonId]);
        for (const [position, question] of (extra?.quiz ?? []).entries()) {
          const options = question.options.map((text, index) => ({ id: `option-${index + 1}`, text }));
          const { rows: questionRows } = await db.query<{ id: string }>(
            `insert into public.quiz_questions (lesson_id, position, prompt, options)
             values ($1, $2, $3, $4) returning id`,
            [lessonId, position, question.prompt, JSON.stringify(options)],
          );
          await db.query(
            `insert into public.quiz_answer_keys (question_id, correct_option_id, explanation)
             values ($1, $2, $3)`,
            [questionRows[0].id, options[question.correct].id, question.explanation],
          );
        }
      }
    }
  }

  for (const resource of DEMO_RESOURCES) {
    const { rows: existing } = await db.query<{ id: string }>(
      "select id from public.learning_resources where source_url = $1",
      [resource.sourceUrl],
    );
    const values = [
      resource.title,
      resource.description,
      resource.kind,
      resource.author,
      resource.sourceName,
      resource.sourceUrl,
      resource.licence,
      resource.licenceNote,
      resource.access,
    ];
    const { rows } = existing[0]
      ? await db.query<{ id: string }>(
          `update public.learning_resources set
             title = $1, description = $2, kind = $3, author = $4, source_name = $5,
             source_url = $6, licence = $7, licence_note = $8, access = $9
           where id = $10 returning id`,
          [...values, existing[0].id],
        )
      : await db.query<{ id: string }>(
          `insert into public.learning_resources (
             title, description, kind, author, source_name, source_url, licence, licence_note,
             access, published
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
           returning id`,
          values,
        );

    for (const slug of resource.courseSlugs) {
      await db.query(
        `insert into public.course_resources (course_id, resource_id) values ($1, $2)
         on conflict do nothing`,
        [courseIds.get(slug), rows[0].id],
      );
    }
  }

  await db.query(
    `update public.learning_scenarios
     set content = $2, lesson_id = $3, review_status = 'awaiting_professional_review'
     where slug = $1`,
    [
      WORKLOAD_SCENARIO.slug,
      JSON.stringify(scenarioContentSchema.parse(WORKLOAD_SCENARIO.content)),
      lessonIds.get(WORKLOAD_SCENARIO_LESSON),
    ],
  );

  await db.query(
    `insert into app_private.seed_state (name, version) values ('academy', $1)
     on conflict (name) do update set version = excluded.version, updated_at = now()`,
    [ACADEMY_CONTENT_VERSION],
  );
}
