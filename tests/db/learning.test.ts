import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedAcademy } from "../../src/lib/db/seed-academy";
import { TestDatabase } from "./harness";

let db: TestDatabase;
let enrolled: string;
let notEnrolled: string;
let psychologist: string;
let courseId: string;
let previewLesson: string;
let paidLesson: string;
let question: { id: string; correct: string; wrong: string };
let answers: Record<string, string>;
let wrongAnswers: Record<string, string>;
let publicResource: string;
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

  enrolled = await db.createUser({ role: "trainee", display_name: "Enrolled" });
  notEnrolled = await db.createUser({ role: "trainee", display_name: "Not enrolled" });
  psychologist = await db.createUser({ role: "psychologist", display_name: "Psychologist" });

  const [course] = await db.admin<{ id: string }>(
    "select id from public.courses where slug = 'stress-management-in-aviation'",
  );
  courseId = course.id;

  const lessons = await db.admin<{ id: string; is_preview: boolean }>(
    `select l.id, l.is_preview from public.lessons l
     join public.course_modules m on m.id = l.module_id
     where m.course_id = $1 order by m.position, l.position`,
    [courseId],
  );
  previewLesson = lessons.find((lesson) => lesson.is_preview)!.id;
  paidLesson = lessons.find((lesson) => !lesson.is_preview)!.id;

  const keys = await db.admin<{ id: string; correct_option_id: string; options: { id: string }[] }>(
    `select q.id, k.correct_option_id, q.options
     from public.quiz_questions q
     join public.quiz_answer_keys k on k.question_id = q.id
     where q.lesson_id = $1`,
    [paidLesson],
  );
  answers = Object.fromEntries(keys.map((key) => [key.id, key.correct_option_id]));
  wrongAnswers = Object.fromEntries(
    keys.map((key) => [key.id, key.options.find((option) => option.id !== key.correct_option_id)!.id]),
  );
  question = {
    id: keys[0].id,
    correct: keys[0].correct_option_id,
    wrong: wrongAnswers[keys[0].id],
  };

  await db.as(enrolled, "select public.enroll_in_course($1)", [courseId]);

  const [open] = await db.admin<{ id: string }>("select id from public.learning_resources where access = 'public' limit 1");
  publicResource = open.id;
  const [gated] = await db.admin<{ id: string }>("select id from public.learning_resources where access = 'enrolled' limit 1");
  enrolledResource = gated.id;
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("full Stress course", () => {
  it("has every lesson written, with a quiz", async () => {
    const lessons = await db.admin<{ is_available: boolean; questions: number }>(
      `select l.is_available,
         (select count(*)::int from public.quiz_questions q where q.lesson_id = l.id) as questions
       from public.lessons l
       join public.course_modules m on m.id = l.module_id
       where m.course_id = $1`,
      [courseId],
    );

    expect(lessons).toHaveLength(9);
    expect(lessons.every((lesson) => lesson.is_available && lesson.questions > 0)).toBe(true);
  });
});

describe("quiz answers", () => {
  it("are never readable by any client", async () => {
    for (const caller of [null, enrolled, notEnrolled, psychologist]) {
      expect(await failure(db.as(caller, "select * from public.quiz_answer_keys"))).toContain("permission denied");
    }
  });

  it("are not stored with the questions a student can read", async () => {
    const [row] = await db.as<Record<string, unknown>>(
      enrolled,
      "select * from public.quiz_questions where id = $1",
      [question.id],
    );
    expect(JSON.stringify(row)).not.toContain("correct");
  });

  it("do not leak through questions of a locked lesson", async () => {
    expect(
      await db.as(notEnrolled, "select id from public.quiz_questions where lesson_id = $1", [paidLesson]),
    ).toHaveLength(0);
    expect(await db.as(null, "select id from public.quiz_questions where lesson_id = $1", [paidLesson])).toHaveLength(0);
  });
});

describe("submitting a quiz", () => {
  it("marks answers on the server and records the score", async () => {
    const [{ result }] = await db.as<{ result: { score: number; total: number } }>(
      enrolled,
      "select public.submit_quiz($1, $2) as result",
      [paidLesson, JSON.stringify(wrongAnswers)],
    );
    expect(result.score).toBe(0);

    const [{ result: second }] = await db.as<{ result: { score: number; total: number } }>(
      enrolled,
      "select public.submit_quiz($1, $2) as result",
      [paidLesson, JSON.stringify(answers)],
    );
    expect(second.score).toBe(second.total);
    expect(
      await db.as(enrolled, "select score from public.quiz_attempts where user_id = $1", [enrolled]),
    ).toHaveLength(2);
  });

  it("cannot be used to read answers without answering everything", async () => {
    expect(
      await failure(db.as(enrolled, "select public.submit_quiz($1, '{}')", [paidLesson])),
    ).toContain("Answer every question");
  });

  it("refuses students without access to the lesson", async () => {
    expect(
      await failure(db.as(notEnrolled, "select public.submit_quiz($1, $2)", [paidLesson, JSON.stringify(answers)])),
    ).toContain("not available");
  });

  it("refuses visitors and psychologists", async () => {
    expect(
      await failure(db.as(null, "select public.submit_quiz($1, $2)", [paidLesson, JSON.stringify(answers)])),
    ).toContain("permission denied");
    expect(
      await failure(db.as(psychologist, "select public.submit_quiz($1, $2)", [paidLesson, JSON.stringify(answers)])),
    ).toContain("not available for your account");
  });

  it("cannot be forged directly", async () => {
    expect(
      await failure(
        db.as(
          enrolled,
          "insert into public.quiz_attempts (user_id, lesson_id, answers, score, total) values ($1, $2, '{}', 9, 9)",
          [enrolled, paidLesson],
        ),
      ),
    ).toContain("permission denied");
  });

  it("is private to each student", async () => {
    expect(await db.as(notEnrolled, "select id from public.quiz_attempts")).toHaveLength(0);
    expect(await db.as(psychologist, "select id from public.quiz_attempts")).toHaveLength(0);
  });
});

describe("lesson progress", () => {
  it("records views and completion for enrolled students", async () => {
    await db.as(enrolled, "select public.record_lesson_view($1)", [paidLesson]);
    await db.as(enrolled, "select public.set_lesson_completion($1, true)", [paidLesson]);

    const [row] = await db.as<{ completed_at: Date | null }>(
      enrolled,
      "select completed_at from public.lesson_progress where lesson_id = $1",
      [paidLesson],
    );
    expect(row.completed_at).not.toBeNull();

    await db.as(enrolled, "select public.set_lesson_completion($1, false)", [paidLesson]);
    const [cleared] = await db.as<{ completed_at: Date | null }>(
      enrolled,
      "select completed_at from public.lesson_progress where lesson_id = $1",
      [paidLesson],
    );
    expect(cleared.completed_at).toBeNull();
  });

  it("is not tracked for preview readers who are not enrolled", async () => {
    await db.as(notEnrolled, "select public.record_lesson_view($1)", [previewLesson]);
    expect(await db.as(notEnrolled, "select lesson_id from public.lesson_progress")).toHaveLength(0);
    expect(
      await failure(db.as(notEnrolled, "select public.set_lesson_completion($1, true)", [previewLesson])),
    ).toContain("Enrol in this course");
  });

  it("cannot be written directly", async () => {
    expect(
      await failure(
        db.as(enrolled, "insert into public.lesson_progress (user_id, lesson_id) values ($1, $2)", [enrolled, previewLesson]),
      ),
    ).toContain("permission denied");
    expect(await failure(db.as(enrolled, "update public.lesson_progress set completed_at = now()"))).toContain(
      "permission denied",
    );
  });

  it("is hidden from other users", async () => {
    expect(await db.as(psychologist, "select lesson_id from public.lesson_progress")).toHaveLength(0);
  });
});

describe("saved resources", () => {
  it("lets students save and remove what they can read", async () => {
    await db.as(notEnrolled, "insert into public.saved_resources (user_id, resource_id) values ($1, $2)", [
      notEnrolled,
      publicResource,
    ]);
    expect(await db.as(notEnrolled, "select resource_id from public.saved_resources")).toHaveLength(1);

    await db.as(notEnrolled, "delete from public.saved_resources where resource_id = $1", [publicResource]);
    expect(await db.as(notEnrolled, "select resource_id from public.saved_resources")).toHaveLength(0);
  });

  it("refuses resources the student cannot read", async () => {
    expect(
      await failure(
        db.as(notEnrolled, "insert into public.saved_resources (user_id, resource_id) values ($1, $2)", [
          notEnrolled,
          enrolledResource,
        ]),
      ),
    ).toContain("row-level security");
  });

  it("refuses saving on another user's behalf", async () => {
    expect(
      await failure(
        db.as(notEnrolled, "insert into public.saved_resources (user_id, resource_id) values ($1, $2)", [
          enrolled,
          publicResource,
        ]),
      ),
    ).toContain("row-level security");
  });
});

describe("scenario links", () => {
  it("leaves the existing scenario table read-only for clients", async () => {
    expect(
      await failure(db.as(enrolled, "update public.learning_scenarios set review_status = 'professionally_reviewed'")),
    ).toContain("permission denied");
  });
});
