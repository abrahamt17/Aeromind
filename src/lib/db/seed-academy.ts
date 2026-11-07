import { DEMO_COURSES, DEMO_INSTRUCTORS, DEMO_RESOURCES } from "@/lib/demo/academy";
import type { SeedDatabase } from "@/lib/db/seed";

const ACADEMY_SEED_LOCK_ID = 7_204_119;

/** Loads the demo catalogue once. Run it inside a transaction. */
export async function seedAcademy(db: SeedDatabase): Promise<void> {
  await db.query(`select pg_advisory_xact_lock(${ACADEMY_SEED_LOCK_ID})`);
  const { rows } = await db.query<{ seeded: boolean }>(
    "select exists (select 1 from public.courses) as seeded",
  );
  if (rows[0].seeded) return;

  const instructorIds = new Map<string, string>();
  for (const instructor of DEMO_INSTRUCTORS) {
    const inserted = await db.query<{ id: string }>(
      `insert into public.instructor_profiles (
         slug, display_name, title, bio, experience, qualifications, expertise,
         verification_status, is_sample, published
       )
       values ($1, $2, $3, $4, $5, $6, $7, 'unverified', true, true)
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
    instructorIds.set(instructor.slug, inserted.rows[0].id);
  }

  const courseIds = new Map<string, string>();
  for (const course of DEMO_COURSES) {
    const lessons = course.modules.flatMap((module) => module.lessons);
    const inserted = await db.query<{ id: string }>(
      `insert into public.courses (
         slug, kind, instructor_id, title, summary, description, category, competencies,
         level, audience, learning_objectives, duration_minutes, review_status,
         is_sample, featured, published
       )
       values (
         $1, $2, $3, $4, $5, $6, $7, $8::text[]::public.competency[], $9, $10, $11, $12,
         'awaiting_professional_review', true, $13, true
       )
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
    const courseId = inserted.rows[0].id;
    courseIds.set(course.slug, courseId);

    for (const [modulePosition, module] of course.modules.entries()) {
      const insertedModule = await db.query<{ id: string }>(
        `insert into public.course_modules (course_id, position, title, summary)
         values ($1, $2, $3, $4) returning id`,
        [courseId, modulePosition, module.title, module.summary],
      );

      for (const [lessonPosition, lesson] of module.lessons.entries()) {
        const insertedLesson = await db.query<{ id: string }>(
          `insert into public.lessons (
             module_id, position, title, summary, duration_minutes, is_preview, is_available
           )
           values ($1, $2, $3, $4, $5, $6, $7) returning id`,
          [
            insertedModule.rows[0].id,
            lessonPosition,
            lesson.title,
            lesson.summary,
            lesson.durationMinutes,
            Boolean(lesson.isPreview),
            Boolean(lesson.content),
          ],
        );

        if (lesson.content) {
          await db.query(
            `insert into public.lesson_content (lesson_id, body, learning_objectives, references_list)
             values ($1, $2, $3, $4)`,
            [
              insertedLesson.rows[0].id,
              lesson.content.body,
              lesson.content.objectives,
              JSON.stringify(lesson.content.references),
            ],
          );
        }
      }
    }
  }

  for (const resource of DEMO_RESOURCES) {
    const inserted = await db.query<{ id: string }>(
      `insert into public.learning_resources (
         title, description, kind, author, source_name, source_url, licence, licence_note,
         access, published
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       returning id`,
      [
        resource.title,
        resource.description,
        resource.kind,
        resource.author,
        resource.sourceName,
        resource.sourceUrl,
        resource.licence,
        resource.licenceNote,
        resource.access,
      ],
    );

    for (const slug of resource.courseSlugs) {
      await db.query("insert into public.course_resources (course_id, resource_id) values ($1, $2)", [
        courseIds.get(slug),
        inserted.rows[0].id,
      ]);
    }
  }
}
