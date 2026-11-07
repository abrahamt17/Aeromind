import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The small part of Supabase the migrations depend on. It lets the same
 * migrations and Row Level Security rules run on the built-in database.
 * A hosted Supabase project already has all of this.
 */
const SUPABASE_STAND_IN = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    password_hash text,
    raw_user_meta_data jsonb not null default '{}'
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid;
  $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema extensions;

  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null
  );
  alter table storage.objects enable row level security;
  grant select, insert, update, delete on storage.objects to authenticated;
`;

export type MigrationRunner = {
  exec(sql: string): Promise<unknown>;
  select<T>(sql: string): Promise<T[]>;
};

type LocalDatabase = {
  exec(sql: string): Promise<unknown>;
  query<T>(sql: string): Promise<{ rows: T[] }>;
};

/** Works with a PGlite database or one of its open transactions. */
export function localRunner(db: LocalDatabase): MigrationRunner {
  return {
    exec: (sql) => db.exec(sql),
    select: async <T>(sql: string) => (await db.query<T>(sql)).rows,
  };
}

/** Applied before the ledger existed, so databases from that time already contain them. */
const BASELINE_MIGRATIONS = [
  "20261107090000_schema.sql",
  "20261107090100_rls.sql",
  "20261107090200_workflow.sql",
  "20261107090300_storage.sql",
];

const MIGRATION_LOCK_ID = 7_204_118;

function recordMigration(name: string): string {
  if (!/^[\w.-]+$/.test(name)) throw new Error(`Invalid migration file name: ${name}`);
  return `insert into app_private.schema_migrations (name) values ('${name}') on conflict do nothing`;
}

/**
 * Applies each migration that has not run yet, exactly once. Run it inside a
 * transaction, so instances starting together wait and a failure changes nothing.
 */
export async function applyMigrations(db: MigrationRunner): Promise<void> {
  await db.select(`select pg_advisory_xact_lock(${MIGRATION_LOCK_ID})`);
  await db.exec(`
    create schema if not exists app_private;
    create table if not exists app_private.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
    revoke all on app_private.schema_migrations from public;
  `);

  const [{ existing }] = await db.select<{ existing: boolean }>(
    "select to_regclass('public.profiles') is not null as existing",
  );
  const ledger = await db.select<{ name: string }>("select name from app_private.schema_migrations");
  const applied = new Set(ledger.map(({ name }) => name));

  if (existing && applied.size === 0) {
    for (const name of BASELINE_MIGRATIONS) {
      await db.exec(recordMigration(name));
      applied.add(name);
    }
  }

  const directory = join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(directory).sort()) {
    if (!file.endsWith(".sql") || applied.has(file)) continue;
    await db.exec(readFileSync(join(directory, file), "utf8"));
    await db.exec(recordMigration(file));
  }
}

/** For the built-in database, which has no Supabase schemas of its own. */
export async function applySchema(db: LocalDatabase): Promise<void> {
  await db.exec(SUPABASE_STAND_IN);
  await applyMigrations(localRunner(db));
}
