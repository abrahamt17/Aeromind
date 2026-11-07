"use server";

import { redirect } from "next/navigation";
import { invalidState } from "@/lib/actions/errors";
import type { ActionState } from "@/lib/actions/state";
import { createAccount, findDemoAccount, verifyCredentials } from "@/lib/auth/accounts";
import { homePathForRole } from "@/lib/auth/routes";
import { signInSchema, signUpSchema } from "@/lib/auth/schemas";
import { clearSession, createSession, getCurrentProfile } from "@/lib/auth/session";

function safeValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of ["displayName", "email", "role"]) {
    const value = formData.get(key);
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

export async function signIn(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidState(parsed.error, safeValues(formData));

  const userId = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!userId) {
    return {
      status: "error",
      message: "That email and password do not match an account.",
      values: safeValues(formData),
    };
  }

  await createSession(userId);
  const profile = await getCurrentProfile();
  redirect(profile ? homePathForRole(profile.role) : "/");
}

export async function signUp(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidState(parsed.error, safeValues(formData));

  const userId = await createAccount(parsed.data);
  if (!userId) {
    return {
      status: "error",
      message: "We could not create that account. Try signing in instead.",
      values: safeValues(formData),
    };
  }

  await createSession(userId);
  redirect(homePathForRole(parsed.data.role));
}

/** One-click entry to the seeded synthetic accounts, for the prototype demo. */
export async function signInToDemo(formData: FormData): Promise<void> {
  const role = formData.get("role") === "psychologist" ? "psychologist" : "trainee";
  const userId = await findDemoAccount(role);
  if (!userId) redirect("/sign-in");

  await createSession(userId);
  redirect(homePathForRole(role));
}

export async function signOut(): Promise<void> {
  await clearSession();
  redirect("/");
}
