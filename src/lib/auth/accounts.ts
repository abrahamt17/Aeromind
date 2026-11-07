import "server-only";
import { isHosted, systemQuery } from "@/lib/db";
import { authClient } from "@/lib/db/hosted";
import { hashPassword, verifyPassword } from "@/lib/db/passwords";
import { DEMO_PSYCHOLOGIST_EMAIL, DEMO_TRAINEE } from "@/lib/demo/data";

type NewAccount = {
  email: string;
  password: string;
  displayName: string;
  role: "trainee" | "psychologist";
};

/** Returns the new user's id, or null if the account could not be created. */
export async function createAccount(input: NewAccount): Promise<string | null> {
  if (isHosted()) {
    // Role is read once by the database sign-up trigger, which accepts only the two public roles.
    const { data, error } = await authClient("publishable").auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { role: input.role, display_name: input.displayName } },
    });

    // Supabase returns a user with no identities when the email is already registered.
    if (error || !data.user || data.user.identities?.length === 0) return null;
    return data.user.id;
  }

  const rows = await systemQuery<{ id: string }>(
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
}

export async function verifyCredentials(email: string, password: string): Promise<string | null> {
  if (isHosted()) {
    const { data, error } = await authClient("publishable").auth.signInWithPassword({ email, password });
    return error ? null : data.user.id;
  }

  const rows = await systemQuery<{ id: string; password_hash: string | null }>(
    "select id, password_hash from auth.users where email = lower($1)",
    [email],
  );
  const user = rows[0];
  return user?.password_hash && verifyPassword(password, user.password_hash) ? user.id : null;
}

export async function findDemoAccount(role: "trainee" | "psychologist"): Promise<string | null> {
  const email = role === "trainee" ? DEMO_TRAINEE.email : DEMO_PSYCHOLOGIST_EMAIL;
  const rows = await systemQuery<{ id: string }>("select id from auth.users where email = $1", [email]);
  return rows[0]?.id ?? null;
}
