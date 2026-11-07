// Full-access database connection for internal commands. Never import this in the app.

import { join } from "node:path";

export function loadSettings() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Settings can also come from the environment.
  }
}

export async function openDatabase() {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 1, prepare: false, ssl: "require", onnotice: () => {} });
    const wrap = (client) => ({ query: (text, params = []) => client.unsafe(text, params) });
    return {
      ...wrap(sql),
      transaction: (work) => sql.begin((tx) => work(wrap(tx))),
      close: () => sql.end(),
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { vector } = await import("@electric-sql/pglite-pgvector");
  // The built-in database allows one process, so stop the app before running a command.
  const pg = new PGlite(join(process.cwd(), ".data", "pglite"), { extensions: { vector } });
  const wrap = (client) => ({ query: async (text, params = []) => (await client.query(text, params)).rows });
  return {
    ...wrap(pg),
    transaction: (work) => pg.transaction((tx) => work(wrap(tx))),
    close: () => pg.close(),
  };
}
