// Prepares course material for the AI tutor. Run it after adding or changing content.
//
//   npm run academy:index
//   npm run academy:index -- --resource <id> --file path/to/document.pdf
//
// Only lessons in courses with AI indexing allowed, and resources marked can_index_ai,
// can be indexed. The database refuses anything else. This internal command uses a
// full-access connection, so it must never be imported by the application.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { chunkText } from "../src/lib/ai/chunking.ts";
import { createEmbeddings, DEFAULT_EMBEDDING_MODEL } from "../src/lib/ai/openai-api.ts";
import { extractPdfText } from "../src/lib/ai/pdf.ts";

const BATCH_SIZE = 50;

try {
  process.loadEnvFile(".env.local");
} catch {
  // Settings can also come from the environment.
}

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  console.error("Set OPENAI_API_KEY in .env.local first.");
  process.exit(1);
}
const embeddingModel = process.env.AI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;

async function openDatabase() {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 1, prepare: false, ssl: "require", onnotice: () => {} });
    return {
      query: (text, params = []) => sql.unsafe(text, params),
      close: () => sql.end(),
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { vector } = await import("@electric-sql/pglite-pgvector");
  // The built-in database allows one process, so stop the app before running this.
  const pg = new PGlite(join(process.cwd(), ".data", "pglite"), { extensions: { vector } });
  return {
    query: async (text, params = []) => (await pg.query(text, params)).rows,
    close: () => pg.close(),
  };
}

function hash(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function embedAll(texts) {
  const embeddings = [];
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    embeddings.push(...(await createEmbeddings(apiKey, embeddingModel, texts.slice(start, start + BATCH_SIZE))));
  }
  return embeddings;
}

/** Replaces a document only when its text or embedding model has changed. */
async function indexDocument(db, source) {
  const column = source.lessonId ? "lesson_id" : "resource_id";
  const id = source.lessonId ?? source.resourceId;
  const contentHash = hash(`${source.title}\n${source.text}`);

  const [existing] = await db.query(
    `select content_hash, embedding_model from public.knowledge_documents where ${column} = $1`,
    [id],
  );
  if (existing?.content_hash === contentHash && existing.embedding_model === embeddingModel) return false;

  const chunks = chunkText(source.title, source.text);
  if (chunks.length === 0) throw new Error(`No text found in "${source.title}"`);
  const embeddings = await embedAll(chunks);

  await db.query(`delete from public.knowledge_documents where ${column} = $1`, [id]);
  const [document] = await db.query(
    `insert into public.knowledge_documents (
       course_id, lesson_id, resource_id, title, source_name, source_url, content_hash, embedding_model
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id`,
    [
      source.courseId ?? null,
      source.lessonId ?? null,
      source.resourceId ?? null,
      source.title,
      source.sourceName,
      source.sourceUrl ?? null,
      contentHash,
      embeddingModel,
    ],
  );

  for (const [position, content] of chunks.entries()) {
    await db.query(
      `insert into public.knowledge_chunks (
         document_id, course_id, lesson_id, resource_id, position, content, embedding
       )
       values ($1, $2, $3, $4, $5, $6, $7::text::extensions.vector)`,
      [
        document.id,
        source.courseId ?? null,
        source.lessonId ?? null,
        source.resourceId ?? null,
        position,
        content,
        JSON.stringify(embeddings[position]),
      ],
    );
  }
  return true;
}

async function indexLessons(db) {
  const lessons = await db.query(
    `select l.id as lesson_id, l.title, lc.body, c.id as course_id, c.title as course_title
     from public.lesson_content lc
     join public.lessons l on l.id = lc.lesson_id
     join public.course_modules m on m.id = l.module_id
     join public.courses c on c.id = m.course_id
     where l.is_available and c.published and c.ai_indexing_allowed
     order by c.title, m.position, l.position`,
  );

  let changed = 0;
  for (const lesson of lessons) {
    const updated = await indexDocument(db, {
      lessonId: lesson.lesson_id,
      courseId: lesson.course_id,
      title: lesson.title,
      text: lesson.body,
      sourceName: lesson.course_title,
    });
    if (updated) changed += 1;
  }
  console.log(`Lessons: ${lessons.length} checked, ${changed} updated.`);
}

async function readDocument(path) {
  const type = extname(path).toLowerCase();
  if (type === ".pdf") return extractPdfText(new Uint8Array(readFileSync(path)));
  if (type === ".txt" || type === ".md") return readFileSync(path, "utf8");
  throw new Error("Only .pdf, .txt and .md files can be indexed.");
}

async function indexResource(db, resourceId, path) {
  const [resource] = await db.query(
    `select id, title, source_name, source_url, can_index_ai
     from public.learning_resources where id = $1`,
    [resourceId],
  );
  if (!resource) throw new Error("Resource not found.");
  if (!resource.can_index_ai) throw new Error("This resource does not allow AI indexing.");

  const text = await readDocument(path);
  await indexDocument(db, {
    resourceId,
    title: resource.title,
    text,
    sourceName: resource.source_name,
    sourceUrl: resource.source_url,
  });
  console.log(`Indexed resource "${resource.title}".`);
}

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const db = await openDatabase();
try {
  const resourceId = option("resource");
  if (resourceId) {
    const file = option("file");
    if (!file) throw new Error("Pass --file with --resource.");
    await indexResource(db, resourceId, file);
  } else {
    await indexLessons(db);
  }
} catch (error) {
  console.error(
    error.message.includes("401")
      ? "OpenAI rejected the API key. Check OPENAI_API_KEY in .env.local. It should start with sk-."
      : error.message,
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
