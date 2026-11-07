import { z } from "zod";

/** Sent to the browser before answering, so it must never include the correct option. */
export type QuizQuestion = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
};

export const quizResultSchema = z.object({
  score: z.number().int(),
  total: z.number().int(),
  results: z.array(
    z.object({
      question_id: z.uuid(),
      selected_option_id: z.string(),
      correct_option_id: z.string(),
      is_correct: z.boolean(),
      explanation: z.string(),
    }),
  ),
});

export type QuizResult = z.infer<typeof quizResultSchema>;
