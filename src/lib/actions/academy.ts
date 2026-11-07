"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorState } from "@/lib/actions/errors";
import type { ActionState } from "@/lib/actions/state";
import { requireRole } from "@/lib/auth/session";
import { asUser } from "@/lib/db";
import { type QuizResult, quizResultSchema } from "@/lib/quiz";

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

export async function setLessonComplete(lessonId: string, completed: boolean): Promise<void> {
  const profile = await requireRole("trainee");
  const input = z.object({ lessonId: z.uuid(), completed: z.boolean() }).parse({ lessonId, completed });

  await asUser(profile.id, (tx) =>
    tx.rows("select public.set_lesson_completion($1, $2)", [input.lessonId, input.completed]),
  );
  revalidatePath("/academy", "layout");
  revalidatePath("/trainee/learning");
}

export async function setResourceSaved(resourceId: string, saved: boolean): Promise<void> {
  const profile = await requireRole("trainee");
  const input = z.object({ resourceId: z.uuid(), saved: z.boolean() }).parse({ resourceId, saved });

  await asUser(profile.id, (tx) =>
    input.saved
      ? tx.rows(
          `insert into public.saved_resources (user_id, resource_id) values ($1, $2)
           on conflict do nothing`,
          [profile.id, input.resourceId],
        )
      : tx.rows("delete from public.saved_resources where user_id = $1 and resource_id = $2", [
          profile.id,
          input.resourceId,
        ]),
  );
  revalidatePath("/academy", "layout");
  revalidatePath("/trainee/learning");
}

export async function submitQuiz(
  lessonId: string,
  answers: Record<string, string>,
): Promise<{ ok: true; result: QuizResult } | { ok: false; message: string }> {
  const profile = await requireRole("trainee");
  const input = z
    .object({
      lessonId: z.uuid(),
      answers: z.record(z.uuid(), z.string().max(20)),
    })
    .safeParse({ lessonId, answers });
  if (!input.success) return { ok: false, message: "Answer every question before submitting." };

  try {
    const row = await asUser(profile.id, (tx) =>
      tx.one<{ result: unknown }>("select public.submit_quiz($1, $2) as result", [
        input.data.lessonId,
        JSON.stringify(input.data.answers),
      ]),
    );
    revalidatePath("/trainee/learning");
    return { ok: true, result: quizResultSchema.parse(row?.result) };
  } catch (error) {
    return { ok: false, message: errorState(error).message ?? "Something went wrong. Please try again." };
  }
}
