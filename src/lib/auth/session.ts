import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";
import { homePathForRole, SESSION_COOKIE } from "@/lib/auth/routes";
import { asUser } from "@/lib/db";

const SESSION_DAYS = 7;

/** Uses SESSION_SECRET when set, otherwise a random secret kept in the data folder. */
function sessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
    return configured;
  }

  // A secret written to disk would change on every hosted instance and sign everyone out.
  if (process.env.VERCEL) {
    throw new Error("SESSION_SECRET must be set when AeroMind is hosted. See docs/DEPLOYMENT.md.");
  }

  const directory = join(process.cwd(), ".data");
  const file = join(directory, "session-secret");
  if (!existsSync(file)) {
    mkdirSync(directory, { recursive: true });
    writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return readFileSync(file, "utf8");
}

function signature(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expires}`;

  (await cookies()).set(SESSION_COOKIE, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The verified user id from the session cookie, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;

  // Checking expiry reads the clock, which is only allowed at request time.
  await connection();

  const [userId, expires, provided] = value.split(".");
  if (!userId || !expires || !provided || Number(expires) < Date.now()) return null;

  const expected = Buffer.from(signature(`${userId}.${expires}`));
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return userId;
}

const profileRowSchema = z.object({
  id: z.uuid(),
  role: z.enum(["trainee", "psychologist", "admin"]),
  display_name: z.string(),
});

export type UserRole = z.infer<typeof profileRowSchema>["role"];

export type CurrentProfile = {
  id: string;
  role: UserRole;
  displayName: string;
};

/**
 * The signed-in user's profile, read once per request. `profiles.role` is the
 * only source of authorization. Do not wrap this in `use cache`: a server cache
 * could outlive a role or session change.
 */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const data = await asUser(userId, (tx) =>
    tx.one("select id, role, display_name from public.profiles where id = $1", [userId]),
  );
  if (!data) return null;

  const row = profileRowSchema.parse(data);
  return { id: row.id, role: row.role, displayName: row.display_name };
});

/** Call from every protected page, behind a Suspense boundary. */
export async function requireRole(role: UserRole): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/sign-in");
  if (profile.role !== role) redirect(homePathForRole(profile.role));

  return profile;
}
