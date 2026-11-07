"use server";

import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import {
  answerLearningQuestion,
  BOUNDARY_RESPONSE,
  classifyQuestion,
  DISTRESS_RESPONSE,
  MAX_QUESTION_CHARACTERS,
  redactPersonalDetails,
  SUPPORT_RESPONSE,
  type SuggestedLesson,
  TUTOR_LEVELS,
  type TutorSource,
} from "@/lib/ai/tutor";
import { requireRole } from "@/lib/auth/session";
import { prepareTutorRequest, retrieveKnowledge } from "@/lib/data/tutor";
import { asUser } from "@/lib/db";

export type TutorReply =
  | { ok: true; answer: string; sources: TutorSource[]; suggestedLessons: SuggestedLesson[]; saved: boolean }
  | { ok: false; message: string };

const askSchema = z.object({
  lessonId: z.uuid(),
  question: z.string().trim().min(1).max(MAX_QUESTION_CHARACTERS),
  level: z.enum(TUTOR_LEVELS),
});

function dailyLimit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export async function askTutor(input: unknown): Promise<TutorReply> {
  const profile = await requireRole("trainee");
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: `Enter a question of up to ${MAX_QUESTION_CHARACTERS} characters.` };
  }

  const { lessonId, level } = parsed.data;

  // These answers are fixed, so nothing is sent to the provider, saved or counted.
  const kind = classifyQuestion(parsed.data.question);
  if (kind !== "learning") {
    return {
      ok: true,
      answer: kind === "distress" ? DISTRESS_RESPONSE : BOUNDARY_RESPONSE,
      sources: [],
      suggestedLessons: [],
      saved: false,
    };
  }

  const provider = getAiProvider();
  if (!provider) return { ok: false, message: "The AI tutor is not connected yet." };

  const question = redactPersonalDetails(parsed.data.question);

  try {
    const preparation = await prepareTutorRequest(profile.id, lessonId, {
      user: dailyLimit("TUTOR_DAILY_LIMIT", 30),
      global: dailyLimit("TUTOR_GLOBAL_DAILY_LIMIT", 500),
    });
    if (preparation.status === "no_access") {
      return { ok: false, message: "Enrol in this course to ask about this lesson." };
    }
    if (preparation.status === "limit_reached") {
      return { ok: false, message: "You have reached today's tutor limit. Please come back tomorrow." };
    }

    // Provider calls happen outside any database transaction.
    const result = await answerLearningQuestion(question, level, preparation.context, {
      embed: async (text) => (await provider.embed([text]))[0],
      retrieve: (embedding) => retrieveKnowledge(profile.id, preparation.courseId, embedding),
      generate: provider.generateJson,
    });
    if (result.status === "failed") return { ok: false, message: result.message };
    if (result.status === "support") {
      return { ok: true, answer: SUPPORT_RESPONSE, sources: [], suggestedLessons: [], saved: false };
    }

    await asUser(profile.id, (tx) =>
      tx.rows("select public.save_tutor_exchange($1, $2, $3, $4, $5)", [
        lessonId,
        question,
        result.answer,
        JSON.stringify(result.sources),
        JSON.stringify(result.suggestedLessons),
      ]),
    );

    return {
      ok: true,
      answer: result.answer,
      sources: result.sources,
      suggestedLessons: result.suggestedLessons,
      saved: true,
    };
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Tutor request failed");
    return { ok: false, message: "The AI tutor is unavailable right now. Please try again later." };
  }
}

export async function clearTutorConversation(lessonId: string): Promise<{ ok: boolean }> {
  const profile = await requireRole("trainee");
  if (!z.uuid().safeParse(lessonId).success) return { ok: false };

  await asUser(profile.id, (tx) =>
    tx.rows("delete from public.ai_conversations where user_id = $1 and lesson_id = $2", [profile.id, lessonId]),
  );
  return { ok: true };
}
