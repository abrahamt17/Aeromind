import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { afterEach, describe, expect, it } from "vitest";
import { applyMigrations, applySchema, localRunner } from "../../src/lib/db/bootstrap";

const BASELINE = [
  "20261107090000_schema.sql",
  "20261107090100_rls.sql",
  "20261107090200_workflow.sql",
  "20261107090300_storage.sql",
];

const OLD_STAND_IN = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create schema storage;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    password_hash text,
    raw_user_meta_data jsonb not null default '{}'
  );
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create table storage.buckets (
    id text primary key, name text not null, public boolean,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text, name text not null
  );
  alter table storage.objects enable row level security;
`;

const open: PGlite[] = [];

function database(): PGlite {
  const pg = new PGlite({ extensions: { vector } });
  open.push(pg);
  return pg;
}

async function ledger(pg: PGlite): Promise<string[]> {
  const { rows } = await pg.query<{ name: string }>(
    "select name from app_private.schema_migrations order by name",
  );
  return rows.map(({ name }) => name);
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((pg) => pg.close()));
});

describe("migrations", () => {
  it("records every migration on a new database and enables vectors", async () => {
    const pg = database();
    await applySchema(pg);

    expect(await ledger(pg)).toEqual(expect.arrayContaining([...BASELINE, "20261107120000_pgvector.sql"]));
    const { rows } = await pg.query<{ distance: number }>(
      "select '[1,0]'::extensions.vector operator(extensions.<=>) '[1,0]'::extensions.vector as distance",
    );
    expect(rows[0].distance).toBe(0);
  });

  it("changes nothing when run again", async () => {
    const pg = database();
    await applySchema(pg);
    const before = await ledger(pg);

    await pg.transaction((tx) => applyMigrations(localRunner(tx)));

    expect(await ledger(pg)).toEqual(before);
  });

  it("upgrades a database created before the ledger, keeping its data", async () => {
    const pg = database();
    await pg.exec(OLD_STAND_IN);
    for (const name of BASELINE) {
      await pg.exec(readFileSync(join(process.cwd(), "supabase", "migrations", name), "utf8"));
    }
    await pg.exec(`
      insert into public.learning_scenarios (slug, title, summary, competency, content)
      values ('kept', 'Kept', 'Kept', 'human_factors', '{}')
    `);

    await pg.transaction((tx) => applyMigrations(localRunner(tx)));

    expect(await ledger(pg)).toEqual(expect.arrayContaining([...BASELINE, "20261107120000_pgvector.sql"]));
    const { rows } = await pg.query("select 1 from public.learning_scenarios where slug = 'kept'");
    expect(rows).toHaveLength(1);
  });
});
