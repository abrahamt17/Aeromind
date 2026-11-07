import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { applyMigrations, applySchema, localRunner } from "@/lib/db/bootstrap";
import { type HostedDatabase, openHostedDatabase, toParameters } from "@/lib/db/hosted";
import { seedDemoData } from "@/lib/db/seed";
import { seedAcademy } from "@/lib/db/seed-academy";

const DATA_DIRECTORY = join(process.cwd(), ".data", "pglite");

/** Supabase when DATABASE_URL is set, otherwise the built-in database. */
const DATABASE_URL = process.env.DATABASE_URL?.trim();

export function isHosted(): boolean {
  return Boolean(DATABASE_URL);
}

async function openLocalDatabase(): Promise<PGlite> {
  mkdirSync(DATA_DIRECTORY, { recursive: true });
  const pg = new PGlite(DATA_DIRECTORY, { extensions: { vector } });
  await pg.waitReady;

  const { rows } = await pg.query<{ ready: boolean }>(
    "select to_regclass('public.profiles') is not null as ready",
  );
  await pg.transaction(async (tx) => {
    await (rows[0].ready ? applyMigrations(localRunner(tx)) : applySchema(tx));
  });
  if (!rows[0].ready) await seedDemoData(pg);
  await pg.transaction((tx) =>
    seedAcademy({ query: async <T>(sql: string, params?: unknown[]) => tx.query<T>(sql, params) }),
  );

  return pg;
}

// Kept on globalThis so hot reloads reuse one connection.
const store = globalThis as typeof globalThis & {
  __aeromindLocal?: Promise<PGlite>;
  __aeromindHosted?: Promise<HostedDatabase>;
};

function getLocal(): Promise<PGlite> {
  store.__aeromindLocal ??= openLocalDatabase();
  return store.__aeromindLocal;
}

function getHosted(url: string): Promise<HostedDatabase> {
  store.__aeromindHosted ??= openHostedDatabase(url).catch((error) => {
    // Allow a retry on the next request if the first connection fails.
    store.__aeromindHosted = undefined;
    throw error;
  });
  return store.__aeromindHosted;
}

export type Tx = {
  rows<T>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T>(sql: string, params?: unknown[]): Promise<T | null>;
};

type RawQuery = (sql: string, params: unknown[]) => Promise<unknown[]>;

function toTx(query: RawQuery): Tx {
  return {
    async rows<R>(sql: string, params: unknown[] = []) {
      return (await query(sql, params)) as R[];
    },
    async one<R>(sql: string, params: unknown[] = []) {
      return ((await query(sql, params))[0] as R | undefined) ?? null;
    },
  };
}

/**
 * Runs queries as a user, or as an anonymous visitor when the id is null. Queries
 * use the `authenticated` and `anon` database roles, so Row Level Security always
 * applies. All application data access must go through this function.
 */
export async function asUser<T>(userId: string | null, work: (tx: Tx) => Promise<T>): Promise<T> {
  const role = userId ? "authenticated" : "anon";
  const claims = JSON.stringify(userId ? { sub: userId, role } : { role });

  if (DATABASE_URL) {
    const sql = await getHosted(DATABASE_URL);

    return (await sql.begin(async (transaction) => {
      // One round trip for both settings, because this runs on every request.
      await transaction.unsafe(
        "select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)",
        [role, claims],
      );

      return work(
        toTx(async (query, params) => [...(await transaction.unsafe(query, toParameters(params)))]),
      );
    })) as T;
  }

  const pg = await getLocal();

  return pg.transaction(async (transaction) => {
    await transaction.exec(`set local role ${role}`);
    await transaction.query("select set_config('request.jwt.claims', $1, true)", [claims]);

    // One connection, so queries started together run one after another.
    let queue: Promise<unknown> = Promise.resolve();
    return work(
      toTx((query, params) => {
        const result = queue.then(async () => (await transaction.query(query, params)).rows);
        queue = result.catch(() => {});
        return result;
      }),
    );
  }) as Promise<T>;
}

/** Full-access queries. Only `src/lib/auth/accounts.ts` may use this. */
export async function systemQuery<T>(query: string, params: unknown[] = []): Promise<T[]> {
  if (DATABASE_URL) {
    const sql = await getHosted(DATABASE_URL);
    return [...(await sql.unsafe(query, toParameters(params)))] as unknown as T[];
  }

  const pg = await getLocal();
  return (await pg.query<T>(query, params)).rows;
}
