"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { submitQuiz } from "@/lib/actions/academy";
import type { QuizQuestion, QuizResult } from "@/lib/quiz";
import { cn } from "@/lib/utils";

export function LessonQuiz({
  lessonId,
  questions,
  canSubmit,
  lastScore,
}: {
  lessonId: string;
  questions: QuizQuestion[];
  canSubmit: boolean;
  lastScore: { score: number; total: number } | null;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const complete = questions.every((question) => answers[question.id]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const response = await submitQuiz(lessonId, answers);
      if (response.ok) setResult(response.result);
      else setError(response.message);
    });
  }

  function retry() {
    setAnswers({});
    setResult(null);
  }

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Check your understanding</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A short knowledge check. It supports your learning and does not measure psychological fitness.
      </p>
      {lastScore && !result ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Your last result: {lastScore.score} of {lastScore.total}
        </p>
      ) : null}

      <ol className="mt-5 space-y-6">
        {questions.map((question, index) => {
          const outcome = result?.results.find((item) => item.question_id === question.id);

          return (
            <li key={question.id}>
              <fieldset disabled={Boolean(result) || pending}>
                <legend className="font-medium">
                  {index + 1}. {question.prompt}
                </legend>
                <div className="mt-2 space-y-2">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm has-[:disabled]:cursor-default",
                        answers[question.id] === option.id && "border-brand bg-brand-soft",
                        outcome?.correct_option_id === option.id && "border-brand",
                      )}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={answers[question.id] === option.id}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                        className="mt-0.5 accent-[var(--brand)]"
                      />
                      {option.text}
                    </label>
                  ))}
                </div>
              </fieldset>

              {outcome ? (
                <div className="mt-2 flex gap-2 rounded-lg bg-muted p-3 text-sm" aria-live="polite">
                  {outcome.is_correct ? (
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
                  ) : (
                    <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <p>
                    <span className="font-medium">{outcome.is_correct ? "Correct. " : "Not quite. "}</span>
                    {outcome.explanation}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-5">
        {result ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium" role="status">
              You scored {result.score} of {result.total}
            </p>
            <Button variant="outline" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : canSubmit ? (
          <Button onClick={submit} disabled={!complete || pending}>
            Check my answers
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Sign in with a trainee account to check your answers.</p>
        )}
      </div>
    </section>
  );
}
