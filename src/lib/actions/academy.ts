"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorState } from "@/lib/actions/errors";
import type { ActionState } from "@/lib/actions/state";
import { requireRole } from "@/lib/auth/session";
import { asUser } from "@/lib/db";

/** Payment is out of scope for the MVP, so enrolment is simulated and free. */
export async function enrollInCourse(courseId: string): Promise<ActionState> {
  const profile = await requireRole("trainee");
  if (!z.uuid().safeParse(courseId).success) {
    return { status: "error", message: "This course is not available." };
  }

  try {
    await asUser(profile.id, (tx) => tx.rows("select public.enroll_in_course($1)", [courseId]));
  } catch (error) {
    return errorState(error);
  }

  revalidatePath("/academy", "layout");
  return { status: "success", message: "You are enrolled in this course." };
}
