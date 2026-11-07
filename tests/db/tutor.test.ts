import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedAcademy } from "../../src/lib/db/seed-academy";
import { TestDatabase } from "./harness";

let db: TestDatabase;
let enrolled: string;
let otherStudent: string;
let psychologist: string;
let courseId: string;
let otherCourseId: string;
let previewLesson: string;
let lockedLesson: string;
let otherLesson: string;
let openResource: string;

const vector = (first: number) => JSON.stringify([first, ...Array(1535).fill(0)]);

async function failure(work: Promise<unknown>): Promise<string> {
  return work.then(
    () => "no error",
    (error: Error) => error.message,
  );
}

async function indexLesson(lessonId: string, course: string, text: string): Promise<void> {
  const [document] = await db.admin<{ id: string }>(
    `insert into public.knowledge_documents
       (course_id, lesson_id, title, source_name, content_hash, embedding_model)
     values ($1, $2, $3, 'Course', $4, 'test') returning id`,
    [course, lessonId, text, "a".repeat(64)],
  );
  await db.admin(
    `insert into public.knowledge_chunks (document_id, course_id, lesson_id, position, content, embedding)
     values ($1, $2, $3, 0, $4, $5::text::extensions.vector)`,
    [document.id, course, lessonId, text, vector(1)],
  );
}

function search(caller: string, course: string) {
  return db.as<{ content: string }>(
    caller,
    "select content from public.search_knowledge($1::text::extensions.vector, $2, 5)",
    [vector(1), course],
  );
}

async function lessonsOf(course: string) {
  return db.admin<{ id: string; is_preview: boolean }>(
    `select l.id, l.is_preview from public.lessons l
     join public.course_modules m on m.id = l.module_id
     where m.course_id = $1 and l.is_available order by m.position, l.position`,
    [course],
  );
}

beforeAll(async () => {
  db = await TestDatabase.create();
  await db.pg.transaction((tx) =>
    seedAcademy({ query: async (sql, params) => ({ rows: (await tx.query(sql, params)).rows as never[] }) }),
  );

  enrolled = await db.createUser({ role: "trainee", display_name: "Enrolled" });
  otherStudent = await db.createUser({ role: "trainee", display_name: "Other" });
  psychologist = await db.createUser({ role: "psychologist", display_name: "Psychologist" });

  [{ id: courseId }] = await db.admin<{ id: string }>(
    "select id from public.courses where slug = 'stress-management-in-aviation'",
  );
  [{ id: otherCourseId }] = await db.admin<{ id: string }>(
    "select id from public.courses where slug = 'aeronautical-decision-making'",
  );

  const lessons = await lessonsOf(courseId);
  previewLesson = lessons.find((lesson) => lesson.is_preview)!.id;
  lockedLesson = lessons.find((lesson) => !lesson.is_preview)!.id;
  otherLesson = (await lessonsOf(otherCourseId))[0].id;

  await indexLesson(previewLesson, courseId, "Preview passage");
  await indexLesson(lockedLesson, courseId, "Locked passage");
  await indexLesson(otherLesson, otherCourseId, "Other course passage");

  [{ id: openResource }] = await db.admin<{ id: string }>(
    "select id from public.learning_resources where access = 'public' limit 1",
  );

  await db.as(enrolled, "select public.enroll_in_course($1)", [courseId]);
}, 60_000);

afterAll(async () => {
  await db.close();
});

describe("knowledge retrieval", () => {
  it("returns course material to an enrolled student", async () => {
    const rows = await search(enrolled, courseId);
    expect(rows.map((row) => row.content).sort()).toEqual(["Locked passage", "Preview passage"]);
  });

  it("gives a student who is not enrolled only preview material", async () => {
    const rows = await search(otherStudent, courseId);
    expect(rows.map((row) => row.content)).toEqual(["Preview passage"]);
  });

  it("stays within the course being studied", async () => {
    const rows = await search(enrolled, courseId);
    expect(rows.map((row) => row.content)).not.toContain("Other course passage");
  });

  it("cannot be bypassed by reading the tables directly", async () => {
    const rows = await db.as<{ content: string }>(otherStudent, "select content from public.knowledge_chunks");
    expect(rows.map((row) => row.content)).not.toContain("Locked passage");
  });

  it("is closed to visitors", async () => {
    expect(await failure(db.as(null, "select content from public.knowledge_chunks"))).toContain("permission denied");
    expect(
      await failure(
        db.as(null, "select * from public.search_knowledge($1::text::extensions.vector, $2, 5)", [vector(1), courseId]),
      ),
    ).toContain("permission denied");
  });

  it("cannot be changed by any client", async () => {
    expect(await failure(db.as(enrolled, "delete from public.knowledge_chunks"))).toContain("permission denied");
    expect(await failure(db.as(enrolled, "update public.knowledge_documents set title = 'x'"))).toContain(
      "permission denied",
    );
  });

  it("disappears when a lesson stops being available", async () => {
    await db.admin("update public.lessons set is_available = false where id = $1", [lockedLesson]);
    expect((await search(enrolled, courseId)).map((row) => row.content)).not.toContain("Locked passage");
    await db.admin("update public.lessons set is_available = true where id = $1", [lockedLesson]);
  });
});

describe("AI indexing permissions", () => {
  it("refuses a resource that does not allow AI indexing", async () => {
    expect(
      await failure(
        db.admin(
          `insert into public.knowledge_documents (resource_id, title, source_name, content_hash, embedding_model)
           values ($1, 'x', 'y', $2, 'test')`,
          [openResource, "a".repeat(64)],
        ),
      ),
    ).toContain("does not allow AI indexing");
  });

  it("removes a resource from the index when permission is withdrawn", async () => {
    await db.admin(
      "update public.learning_resources set licence = 'permission_granted', can_index_ai = true where id = $1",
      [openResource],
    );
    await db.admin(
      `insert into public.knowledge_documents (resource_id, title, source_name, content_hash, embedding_model)
       values ($1, 'Resource', 'Source', $2, 'test')`,
      [openResource, "b".repeat(64)],
    );

    await db.admin("update public.learning_resources set can_index_ai = false where id = $1", [openResource]);

    expect(await db.admin("select 1 from public.knowledge_documents where resource_id = $1", [openResource])).toHaveLength(0);
    await db.admin("update public.learning_resources set licence = 'link_only' where id = $1", [openResource]);
  });

  it("removes a course from the index when it stops allowing AI use", async () => {
    await db.admin("update public.courses set ai_indexing_allowed = false where id = $1", [otherCourseId]);

    expect(await db.admin("select 1 from public.knowledge_chunks where course_id = $1", [otherCourseId])).toHaveLength(0);
    await db.admin("update public.courses set ai_indexing_allowed = true where id = $1", [otherCourseId]);
  });
});

describe("conversations", () => {
  it("saves an exchange for a lesson the student can read", async () => {
    await db.as(enrolled, "select public.save_tutor_exchange($1, 'Question', 'Answer', '[]', '[]')", [lockedLesson]);

    const rows = await db.as<{ role: string }>(enrolled, "select role from public.ai_messages");
    expect(rows.map((row) => row.role).sort()).toEqual(["assistant", "user"]);
  });

  it("continues the same conversation for a lesson", async () => {
    await db.as(enrolled, "select public.save_tutor_exchange($1, 'Again', 'Answer', '[]', '[]')", [lockedLesson]);
    expect(await db.as(enrolled, "select id from public.ai_conversations")).toHaveLength(1);
    expect(await db.as(enrolled, "select id from public.ai_messages")).toHaveLength(4);
  });

  it("is private from other students, psychologists and visitors", async () => {
    expect(await db.as(otherStudent, "select id from public.ai_messages")).toHaveLength(0);
    expect(await db.as(psychologist, "select id from public.ai_conversations")).toHaveLength(0);
    expect(await failure(db.as(null, "select id from public.ai_messages"))).toContain("permission denied");
  });

  it("refuses lessons the student cannot read", async () => {
    expect(
      await failure(
        db.as(otherStudent, "select public.save_tutor_exchange($1, 'Q', 'A', '[]', '[]')", [lockedLesson]),
      ),
    ).toContain("not available");
  });

  it("cannot be written directly", async () => {
    expect(
      await failure(db.as(enrolled, "insert into public.ai_conversations (user_id, lesson_id) values ($1, $2)", [enrolled, previewLesson])),
    ).toContain("permission denied");
  });

  it("can be deleted by the student, including every message", async () => {
    await db.as(otherStudent, "delete from public.ai_conversations");
    expect(await db.as(enrolled, "select id from public.ai_conversations")).toHaveLength(1);

    await db.as(enrolled, "delete from public.ai_conversations");
    expect(await db.admin("select 1 from public.ai_messages")).toHaveLength(0);
  });
});

describe("usage limits", () => {
  it("stops a student at the daily limit", async () => {
    const student = await db.createUser({ role: "trainee", display_name: "Limited" });
    const reserve = async () =>
      (await db.as<{ allowed: boolean }>(student, "select public.reserve_tutor_request(2, 1000) as allowed"))[0].allowed;

    expect(await reserve()).toBe(true);
    expect(await reserve()).toBe(true);
    expect(await reserve()).toBe(false);
  });

  it("stops everyone at the total daily limit", async () => {
    const student = await db.createUser({ role: "trainee", display_name: "Global" });
    const [row] = await db.as<{ allowed: boolean }>(student, "select public.reserve_tutor_request(5, 1) as allowed");
    expect(row.allowed).toBe(false);
  });

  it("cannot be reset by a student", async () => {
    expect(await failure(db.as(enrolled, "delete from public.ai_usage_daily"))).toContain("permission denied");
    expect(await failure(db.as(enrolled, "update public.ai_usage_daily set requests = 0"))).toContain("permission denied");
  });

  it("is limited to trainees", async () => {
    expect(await failure(db.as(psychologist, "select public.reserve_tutor_request(5, 5)"))).toContain(
      "not available for your account",
    );
  });
});
