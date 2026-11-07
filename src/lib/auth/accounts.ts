import "server-only";
import { asSystem } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/db/passwords";
import { DEMO_PSYCHOLOGIST_EMAIL, DEMO_TRAINEE } from "@/lib/demo/data";

/** Returns the new user's id, or null if the email is already registered. */
export async function createAccount(input: {
  email: string;
  password: string;
  displayName: string;
  role: "trainee" | "psychologist";
}): Promise<string | null> {
  return asSystem(async (pg) => {
    const { rows } = await pg.query<{ id: string }>(
      `insert into auth.users (email, password_hash, raw_user_meta_data)
       values (lower($1), $2, $3)
       on conflict (email) do nothing
       returning id`,
      [
        input.email,
        hashPassword(input.password),
        JSON.stringify({ role: input.role, display_name: input.displayName }),
      ],
    );
    return rows[0]?.id ?? null;
  });
}

export async function verifyCredentials(email: string, password: string): Promise<string | null> {
  return asSystem(async (pg) => {
    const { rows } = await pg.query<{ id: string; password_hash: string | null }>(
      "select id, password_hash from auth.users where email = lower($1)",
      [email],
    );
    const user = rows[0];
    return user?.password_hash && verifyPassword(password, user.password_hash) ? user.id : null;
  });
}

export async function findDemoAccount(role: "trainee" | "psychologist"): Promise<string | null> {
  const email = role === "trainee" ? DEMO_TRAINEE.email : DEMO_PSYCHOLOGIST_EMAIL;

  return asSystem(async (pg) => {
    const { rows } = await pg.query<{ id: string }>("select id from auth.users where email = $1", [email]);
    return rows[0]?.id ?? null;
  });
}
