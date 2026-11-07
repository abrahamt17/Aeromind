import "server-only";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { applyMigrations } from "@/lib/db/bootstrap";
import { seedDemoData, type SeedDatabase } from "@/lib/db/seed";
import { seedAcademy } from "@/lib/db/seed-academy";

export type HostedDatabase = postgres.Sql;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when DATABASE_URL is set`);
  return value;
}

/** A fresh client each time, so no user's session is ever shared between requests. */
export function authClient(key: "publishable" | "secret") {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required(key === "secret" ? "SUPABASE_SECRET_KEY" : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function jsonText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function pgArray(values: unknown[]): string {
  const items = values.map((value) => `"${String(value).replace(/(["\\])/g, "\\$1")}"`);
  return `{${items.join(",")}}`;
}

/** Postgres arrays are sent as literals, because raw queries do not convert JS arrays. */
export function toParameters(params: unknown[]): postgres.ParameterOrJSON<never>[] {
  return params.map((param) =>
    Array.isArray(param) ? pgArray(param) : (param as postgres.ParameterOrJSON<never>),
  );
}

async function createDemoUser({
  email,
  role,
  displayName,
}: {
  email: string;
  role: string;
  displayName: string;
}): Promise<string> {
  const { data, error } = await authClient("secret").auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role, display_name: displayName },
  });
  if (error) throw new Error(`Could not create demo user: ${error.message}`);
  return data.user.id;
}

export async function openHostedDatabase(url: string): Promise<HostedDatabase> {
  const sql = postgres(url, {
    // Prepared statements are off so this also works through Supabase's poolers.
    max: 4,
    prepare: false,
    ssl: "require",
    onnotice: () => {},
    // Queries pass JSON as text, so it must not be encoded a second time.
    types: {
      json: { to: 114, from: [114], serialize: jsonText, parse: JSON.parse },
      jsonb: { to: 3802, from: [3802], serialize: jsonText, parse: JSON.parse },
    },
  });

  await sql.begin((tx) =>
    applyMigrations({
      exec: (script) => tx.unsafe(script),
      select: async <T>(query: string) => (await tx.unsafe(query)) as unknown as T[],
    }),
  );

  // Plan items are the last thing seeded, so this also catches an interrupted seed.
  const [{ seeded }] = await sql<{ seeded: boolean }[]>`
    select exists (select 1 from public.development_plan_items) as seeded
  `;
  if (!seeded) {
    await sql`delete from public.learning_scenarios`;
    await sql`delete from auth.users where email like '%@aeromind.example'`;

    const seedDatabase: SeedDatabase = {
      async query<T>(query: string, params: unknown[] = []) {
        return { rows: (await sql.unsafe(query, toParameters(params))) as unknown as T[] };
      },
    };
    await seedDemoData(seedDatabase, createDemoUser);
  }

  await sql.begin((tx) =>
    seedAcademy({
      async query<T>(query: string, params: unknown[] = []) {
        return { rows: (await tx.unsafe(query, toParameters(params))) as unknown as T[] };
      },
    }),
  );

  return sql;
}
