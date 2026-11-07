import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { applySchema } from "@/lib/db/bootstrap";
import { seedDemoData } from "@/lib/db/seed";

const DATA_DIRECTORY = join(process.cwd(), ".data", "pglite");

async function openDatabase(): Promise<PGlite> {
  mkdirSync(DATA_DIRECTORY, { recursive: true });
  const pg = new PGlite(DATA_DIRECTORY);
  await pg.waitReady;

  const { rows } = await pg.query<{ ready: boolean }>(
    "select to_regclass('public.profiles') is not null as ready",
  );
  if (!rows[0].ready) {
    await applySchema(pg);
    await seedDemoData(pg);
  }

  return pg;
}

// Kept on globalThis so hot reloads reuse the one connection to the data folder.
const store = globalThis as typeof globalThis & { __aeromindDb?: Promise<PGlite> };

function getDatabase(): Promise<PGlite> {
  store.__aeromindDb ??= openDatabase();
  return store.__aeromindDb;
}

export type Tx = {
  rows<T>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T>(sql: string, params?: unknown[]): Promise<T | null>;
};

/**
 * Runs queries as a user, or as an anonymous visitor when the id is null. Queries
 * use the same database roles as Supabase, so Row Level Security always applies.
 * All application data access must go through this function.
 */
export async function asUser<T>(userId: string | null, work: (tx: Tx) => Promise<T>): Promise<T> {
  const pg = await getDatabase();

  return pg.transaction(async (transaction) => {
    const role = userId ? "authenticated" : "anon";
    await transaction.exec(`set local role ${role}`);
    await transaction.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(userId ? { sub: userId, role } : { role }),
    ]);

    return work({
      async rows<R>(sql: string, params: unknown[] = []) {
        return (await transaction.query<R>(sql, params)).rows;
      },
      async one<R>(sql: string, params: unknown[] = []) {
        return (await transaction.query<R>(sql, params)).rows[0] ?? null;
      },
    });
  }) as Promise<T>;
}

/** Full-access queries. Only `src/lib/auth/accounts.ts` may use this. */
export async function asSystem<T>(work: (pg: PGlite) => Promise<T>): Promise<T> {
  return work(await getDatabase());
}
