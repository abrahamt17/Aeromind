import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedAcademy } from "../../src/lib/db/seed-academy";
import { TestDatabase } from "./harness";

let db: TestDatabase;
let trainee: string;
let otherTrainee: string;
let psychologist: string;
let previewLesson: string;
let lockedLesson: string;
let courseId: string;
let otherCourseId: string;
let enrolledResource: string;

async function failure(work: Promise<unknown>): Promise<string> {
  return work.then(
    () => "no error",
    (error: Error) => error.message,
  );
}

beforeAll(async () => {
  db = await TestDatabase.create();
  await db.pg.transaction((tx) =>
    seedAcademy({ query: async (sql, params) => ({ rows: (await tx.query(sql, params)).rows as never[] }) }),
  );

  trainee = await db.createUser({ role: "trainee", display_name: "Trainee" });
  otherTrainee = await db.createUser({ role: "trainee", display_name: "Other" });
  psychologist = await db.createUser({ role: "psychologist", display_name: "Psychologist" });

  const [course] = await db.admin<{ id: string }>(
    "select id from public.courses where slug = 'fatigue-and-sleep-management'",
  );
  courseId = course.id;
  const [other] = await db.admin<{ id: string }>(
    "select id from public.courses where slug = 'cognitive-biases-in-aviation'",
  );
  otherCourseId = other.id;

  const [preview] = await db.admin<{ id: string }>(
    `select l.id from public.lessons l
     join public.course_modules m on m.id = l.module_id
     where m.course_id = $1 and l.is_preview`,
    [courseId],
  );
  previewLesson = preview.id;

  // A written lesson that is not a preview, which only enrolled students may read.
  const [locked] = await db.admin<{ id: string }>(
    `update public.lessons set is_available = true
     where id = (
       select l.id from public.lessons l
       join public.course_modules m on m.id = l.module_id
       where m.course_id = $1 and not l.is_preview
       order by m.position, l.position limit 1
     )
     returning id`,
    [courseId],
  );
  lockedLesson = locked.id;
  await db.admin("insert into public.lesson_content (lesson_id, body) values ($1, 'Enrolled only')", [
    lockedLesson,
  ]);

  const [resource] = await db.admin<{ id: string }>(
    "select id from public.learning_resources where access = 'enrolled' limit 1",
  );
  enrolledResource = resource.id;
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("Academy catalogue", () => {
  it("shows published outlines to visitors", async () => {
    expect(await db.as(null, "select id from public.courses")).toHaveLength(4);
    expect((await db.as(null, "select id from public.lessons")).length).toBeGreaterThan(20);
  });

  it("hides unpublished courses and their outlines", async () => {
    await db.admin("update public.courses set published = false where id = $1", [otherCourseId]);

    expect(await db.as(trainee, "select id from public.courses where id = $1", [otherCourseId])).toHaveLength(0);
    expect(
      await db.as(trainee, "select id from public.course_modules where course_id = $1", [otherCourseId]),
    ).toHaveLength(0);

    await db.admin("update public.courses set published = true where id = $1", [otherCourseId]);
  });

  it("does not expose an instructor's linked account", async () => {
    expect(await failure(db.as(null, "select user_id from public.instructor_profiles"))).toContain(
      "permission denied",
    );
    expect(await db.as(null, "select slug from public.instructor_profiles")).toHaveLength(2);
  });

  it("labels demo content and never marks a sample instructor as verified", async () => {
    expect(await db.admin("select 1 from public.courses where not is_sample")).toHaveLength(0);
    expect(
      await db.admin("select 1 from public.courses where review_status = 'professionally_reviewed'"),
    ).toHaveLength(0);
    expect(
      await db.admin("select 1 from public.instructor_profiles where verification_status <> 'unverified'"),
    ).toHaveLength(0);
  });

  it("stops every client from changing the catalogue", async () => {
    for (const caller of [null, trainee, psychologist]) {
      expect(await failure(db.as(caller, "update public.courses set featured = true"))).toContain(
        "permission denied",
      );
      expect(await failure(db.as(caller, "update public.lesson_content set body = 'x'"))).toContain(
        "permission denied",
      );
      expect(
        await failure(db.as(caller, "update public.instructor_profiles set verification_status = 'verified'")),
      ).toContain("permission denied");
    }
  });
});

describe("lesson access", () => {
  it("opens preview lessons to everyone", async () => {
    const rows = await db.as(null, "select body from public.lesson_content where lesson_id = $1", [previewLesson]);
    expect(rows).toHaveLength(1);
  });

  it("keeps other lessons from visitors and non-enrolled students", async () => {
    for (const caller of [null, trainee, psychologist]) {
      const rows = await db.as(caller, "select body from public.lesson_content where lesson_id = $1", [lockedLesson]);
      expect(rows).toHaveLength(0);
    }
  });

  it("opens lessons after enrolment, for that student only", async () => {
    await db.as(trainee, "select public.enroll_in_course($1)", [courseId]);

    expect(
      await db.as(trainee, "select body from public.lesson_content where lesson_id = $1", [lockedLesson]),
    ).toHaveLength(1);
    expect(
      await db.as(otherTrainee, "select body from public.lesson_content where lesson_id = $1", [lockedLesson]),
    ).toHaveLength(0);
  });

  it("does not let enrolment in one course open another", async () => {
    const [lesson] = await db.admin<{ id: string }>(
      `update public.lessons set is_available = true
       where id = (
         select l.id from public.lessons l
         join public.course_modules m on m.id = l.module_id
         where m.course_id = $1 and not l.is_preview limit 1
       ) returning id`,
      [otherCourseId],
    );
    await db.admin("insert into public.lesson_content (lesson_id, body) values ($1, 'Other course')", [lesson.id]);

    expect(
      await db.as(trainee, "select body from public.lesson_content where lesson_id = $1", [lesson.id]),
    ).toHaveLength(0);
  });
});

describe("enrolment", () => {
  it("cannot be written directly", async () => {
    expect(
      await failure(
        db.as(otherTrainee, "insert into public.course_enrollments (course_id, user_id) values ($1, $2)", [
          courseId,
          otherTrainee,
        ]),
      ),
    ).toContain("permission denied");
  });

  it("is limited to trainees and signed-in users", async () => {
    expect(await failure(db.as(psychologist, "select public.enroll_in_course($1)", [courseId]))).toContain(
      "not available for your account",
    );
    expect(await failure(db.as(null, "select public.enroll_in_course($1)", [courseId]))).toContain(
      "permission denied",
    );
  });

  it("refuses unpublished courses", async () => {
    await db.admin("update public.courses set published = false where id = $1", [otherCourseId]);
    expect(await failure(db.as(otherTrainee, "select public.enroll_in_course($1)", [otherCourseId]))).toContain(
      "not available",
    );
    await db.admin("update public.courses set published = true where id = $1", [otherCourseId]);
  });

  it("is safe to repeat and logs one event", async () => {
    await db.as(otherTrainee, "select public.enroll_in_course($1)", [courseId]);
    await db.as(otherTrainee, "select public.enroll_in_course($1)", [courseId]);

    expect(
      await db.admin("select 1 from public.course_enrollments where user_id = $1 and course_id = $2", [
        otherTrainee,
        courseId,
      ]),
    ).toHaveLength(1);
    expect(
      await db.admin("select 1 from public.audit_events where actor_id = $1 and event_type = 'course.enrolled'", [
        otherTrainee,
      ]),
    ).toHaveLength(1);
  });

  it("is private to each student", async () => {
    expect(await db.as(psychologist, "select id from public.course_enrollments")).toHaveLength(0);
    expect(await failure(db.as(null, "select id from public.course_enrollments"))).toContain("permission denied");
  });
});

describe("resources", () => {
  it("gates each resource by its access level", async () => {
    const newcomer = await db.createUser({ role: "trainee", display_name: "New" });
    const sql = "select access from public.learning_resources";
    const levels = async (caller: string | null) =>
      new Set((await db.as<{ access: string }>(caller, sql)).map(({ access }) => access));

    expect(await levels(null)).toEqual(new Set(["public"]));
    expect(await levels(newcomer)).toEqual(new Set(["public", "free_account"]));
    expect(await levels(trainee)).toEqual(new Set(["public", "free_account", "enrolled"]));
  });

  it("hides paid resources even from enrolled students", async () => {
    await db.admin("update public.learning_resources set access = 'paid' where id = $1", [enrolledResource]);

    expect(
      await db.as(trainee, "select id from public.learning_resources where id = $1", [enrolledResource]),
    ).toHaveLength(0);

    await db.admin("update public.learning_resources set access = 'enrolled' where id = $1", [enrolledResource]);
  });

  it("refuses to grant permissions on a link-only resource", async () => {
    expect(
      await failure(
        db.admin("update public.learning_resources set can_index_ai = true where id = $1", [enrolledResource]),
      ),
    ).toContain("link_only_grants_nothing");
  });
});
