import { PGlite, type Transaction } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { applySchema } from "../../src/lib/db/bootstrap";

/** Runs the real migrations on an in-memory copy of the built-in database. */
export type Caller = string | null;

export class TestDatabase {
  private constructor(readonly pg: PGlite) {}

  static async create(): Promise<TestDatabase> {
    const pg = new PGlite({ extensions: { vector } });
    await applySchema(pg);
    return new TestDatabase(pg);
  }

  /** Creates a user the way sign-up does, firing the sign-up trigger. */
  async createUser(metadata: Record<string, unknown>): Promise<string> {
    const { rows } = await this.pg.query<{ id: string }>(
      "insert into auth.users (raw_user_meta_data) values ($1) returning id",
      [JSON.stringify(metadata)],
    );
    return rows[0].id;
  }

  /** Runs one query as a signed-in user, or as anon when the caller is null. */
  async as<T = Record<string, unknown>>(
    caller: Caller,
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    return this.pg.transaction(async (tx: Transaction) => {
      const role = caller ? "authenticated" : "anon";
      await tx.exec(`set local role ${role}`);
      await tx.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(caller ? { sub: caller, role } : { role }),
      ]);
      const result = await tx.query<T>(sql, params);
      return result.rows;
    }) as Promise<T[]>;
  }

  /** Runs a query with full access, like the seed. */
  async admin<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await this.pg.query<T>(sql, params)).rows;
  }

  async close(): Promise<void> {
    await this.pg.close();
  }
}
