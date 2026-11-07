import "server-only";
import { asUser } from "@/lib/db";
import type { LessonReference } from "@/lib/demo/academy";
import type { CourseKind, CourseLevel, ResourceAccess, ReviewStatus, VerificationStatus } from "@/lib/labels";

export type CourseSummary = {
  id: string;
  slug: string;
  kind: CourseKind;
  title: string;
  summary: string;
  category: string;
  level: CourseLevel;
  duration_minutes: number;
  review_status: ReviewStatus;
  is_sample: boolean;
  featured: boolean;
  instructor_name: string | null;
  instructor_slug: string | null;
  lesson_count: number;
};

const COURSE_SUMMARY_SELECT = `
  select c.id, c.slug, c.kind, c.title, c.summary, c.category, c.level, c.duration_minutes,
    c.review_status, c.is_sample, c.featured,
    i.display_name as instructor_name, i.slug as instructor_slug,
    (select count(*)::int
     from public.lessons l
     join public.course_modules m on m.id = l.module_id
     where m.course_id = c.id) as lesson_count
  from public.courses c
  left join public.instructor_profiles i on i.id = c.instructor_id
`;

export type CatalogueFilters = { query: string; category: string; level: string };

export async function listCourses(
  filters: CatalogueFilters,
): Promise<{ courses: CourseSummary[]; categories: string[] }> {
  const all = await asUser(null, (tx) =>
    tx.rows<CourseSummary>(`${COURSE_SUMMARY_SELECT} order by c.featured desc, c.title`),
  );

  const query = filters.query.trim().toLowerCase();
  const courses = all.filter((course) => {
    const searchable = [course.title, course.summary, course.category, course.instructor_name ?? ""];
    return (
      (!query || searchable.join(" ").toLowerCase().includes(query)) &&
      (!filters.category || course.category === filters.category) &&
      (!filters.level || course.level === filters.level)
    );
  });

  return { courses, categories: [...new Set(all.map((course) => course.category))].sort() };
}

export type LessonOutline = {
  id: string;
  title: string;
  summary: string;
  duration_minutes: number;
  is_preview: boolean;
  is_available: boolean;
};

export type ModuleOutline = { id: string; title: string; summary: string; lessons: LessonOutline[] };

export type InstructorSummary = {
  id: string;
  slug: string;
  display_name: string;
  title: string;
  bio: string;
  verification_status: VerificationStatus;
  is_sample: boolean;
};

export type CourseDetail = CourseSummary & {
  description: string;
  audience: string;
  learning_objectives: string[];
  instructor: InstructorSummary | null;
  modules: ModuleOutline[];
  resources: Resource[];
  enrolled: boolean;
};

export async function getCourse(slug: string, userId: string | null): Promise<CourseDetail | null> {
  return asUser(userId, async (tx) => {
    const course = await tx.one<
      CourseSummary & {
        description: string;
        audience: string;
        learning_objectives: string[];
        instructor_id: string | null;
      }
    >(
      `select course.*, c.description, c.audience, c.learning_objectives, c.instructor_id
       from public.courses c
       join (${COURSE_SUMMARY_SELECT}) course on course.id = c.id
       where c.slug = $1`,
      [slug],
    );
    if (!course) return null;

    const instructor = course.instructor_id
      ? await tx.one<InstructorSummary>(
          `select id, slug, display_name, title, bio, verification_status, is_sample
           from public.instructor_profiles where id = $1`,
          [course.instructor_id],
        )
      : null;

    const modules = await tx.rows<Omit<ModuleOutline, "lessons">>(
      "select id, title, summary from public.course_modules where course_id = $1 order by position",
      [course.id],
    );
    const lessons = await tx.rows<LessonOutline & { module_id: string }>(
      `select l.id, l.module_id, l.title, l.summary, l.duration_minutes, l.is_preview, l.is_available
       from public.lessons l
       join public.course_modules m on m.id = l.module_id
       where m.course_id = $1
       order by l.position`,
      [course.id],
    );
    const resources = await tx.rows<Resource>(
      `${RESOURCE_SELECT}
       join public.course_resources cr on cr.resource_id = r.id
       where cr.course_id = $1
       order by r.title`,
      [course.id],
    );
    const enrollment = userId
      ? await tx.one("select 1 from public.course_enrollments where course_id = $1 and user_id = $2", [
          course.id,
          userId,
        ])
      : null;

    return {
      ...course,
      instructor,
      modules: modules.map((module) => ({
        ...module,
        lessons: lessons.filter((lesson) => lesson.module_id === module.id),
      })),
      resources,
      enrolled: Boolean(enrollment),
    };
  });
}

export type LessonDetail = {
  course: CourseDetail;
  lesson: LessonOutline;
  moduleTitle: string;
  /** Null when this reader has no access. RLS decides this, not the page. */
  content: { body: string; learning_objectives: string[]; references_list: LessonReference[] } | null;
  previous: LessonOutline | null;
  next: LessonOutline | null;
};

export async function getLesson(
  slug: string,
  lessonId: string,
  userId: string | null,
): Promise<LessonDetail | null> {
  const course = await getCourse(slug, userId);
  if (!course) return null;

  const ordered = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ lesson, moduleTitle: module.title })),
  );
  const index = ordered.findIndex(({ lesson }) => lesson.id === lessonId);
  if (index < 0) return null;

  const content = await asUser(userId, (tx) =>
    tx.one<NonNullable<LessonDetail["content"]>>(
      "select body, learning_objectives, references_list from public.lesson_content where lesson_id = $1",
      [lessonId],
    ),
  );

  const available = (position: number, step: number) => {
    for (let i = position; i >= 0 && i < ordered.length; i += step) {
      if (ordered[i].lesson.is_available) return ordered[i].lesson;
    }
    return null;
  };

  return {
    course,
    lesson: ordered[index].lesson,
    moduleTitle: ordered[index].moduleTitle,
    content,
    previous: available(index - 1, -1),
    next: available(index + 1, 1),
  };
}

export type InstructorProfile = InstructorSummary & {
  experience: string;
  qualifications: string[];
  expertise: string[];
  courses: CourseSummary[];
};

export async function getInstructor(slug: string): Promise<InstructorProfile | null> {
  return asUser(null, async (tx) => {
    const instructor = await tx.one<Omit<InstructorProfile, "courses">>(
      `select id, slug, display_name, title, bio, experience, qualifications, expertise,
         verification_status, is_sample
       from public.instructor_profiles where slug = $1`,
      [slug],
    );
    if (!instructor) return null;

    const courses = await tx.rows<CourseSummary>(
      `${COURSE_SUMMARY_SELECT} where c.instructor_id = $1 order by c.title`,
      [instructor.id],
    );
    return { ...instructor, courses };
  });
}

export type Resource = {
  id: string;
  title: string;
  description: string;
  kind: string;
  author: string;
  source_name: string;
  source_url: string | null;
  published_on: Date | null;
  licence: string;
  licence_note: string;
  can_download: boolean;
  can_index_ai: boolean;
  access: ResourceAccess;
};

const RESOURCE_SELECT = `
  select r.id, r.title, r.description, r.kind, r.author, r.source_name, r.source_url,
    r.published_on, r.licence, r.licence_note, r.can_download, r.can_index_ai, r.access
  from public.learning_resources r
`;

/** RLS removes anything this reader's access level does not allow. */
export async function listResources(userId: string | null): Promise<Resource[]> {
  return asUser(userId, (tx) => tx.rows<Resource>(`${RESOURCE_SELECT} order by r.title`));
}
