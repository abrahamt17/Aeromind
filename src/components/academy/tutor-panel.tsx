"use client";

import { ExternalLink, LoaderCircle, MessageCircleQuestion, Send, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { LessonBody } from "@/components/academy/lesson-body";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askTutor, clearTutorConversation } from "@/lib/actions/tutor";
import { MAX_QUESTION_CHARACTERS, TUTOR_LEVELS, type TutorLevel } from "@/lib/ai/tutor";
import type { TutorMessage } from "@/lib/data/tutor";
import { COURSE_LEVEL_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Explain this more simply",
  "Give me an aviation example",
  "Test my understanding",
  "Summarize this lesson",
  "Create a practice scenario",
];

function Sources({ message, courseSlug }: { message: TutorMessage; courseSlug: string }) {
  if (message.sources.length === 0 && message.suggestedLessons.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-t pt-2 text-xs">
      {message.sources.length > 0 ? (
        <div>
          <p className="font-medium text-muted-foreground">Sources</p>
          <ul className="mt-1 space-y-1">
            {message.sources.map((source) => (
              <li key={`${source.lesson_id}-${source.title}`}>
                {source.lesson_id ? (
                  <Link
                    href={`/academy/courses/${courseSlug}/lessons/${source.lesson_id}`}
                    className="text-brand underline-offset-4 hover:underline"
                  >
                    {source.title}
                  </Link>
                ) : source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand underline-offset-4 hover:underline"
                  >
                    {source.title}
                    <ExternalLink aria-hidden="true" className="size-3" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  source.title
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {message.suggestedLessons.length > 0 ? (
        <div>
          <p className="font-medium text-muted-foreground">You could review</p>
          <ul className="mt-1 space-y-1">
            {message.suggestedLessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/academy/courses/${courseSlug}/lessons/${lesson.id}`}
                  className="text-brand underline-offset-4 hover:underline"
                >
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function TutorPanel({
  lessonId,
  courseSlug,
  connected,
  initialMessages,
}: {
  lessonId: string;
  courseSlug: string;
  connected: boolean;
  initialMessages: TutorMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [question, setQuestion] = useState("");
  const [level, setLevel] = useState<TutorLevel>("beginner");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, pending]);

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const local = crypto.randomUUID();
    setError(null);
    setQuestion("");
    setMessages((current) => [
      ...current,
      { id: local, role: "user", content: trimmed, sources: [], suggestedLessons: [] },
    ]);

    startTransition(async () => {
      const reply = await askTutor({ lessonId, question: trimmed, level });
      if (reply.ok) {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: reply.answer,
            sources: reply.sources,
            suggestedLessons: reply.suggestedLessons,
          },
        ]);
      } else {
        setError(reply.message);
        setQuestion(trimmed);
        setMessages((current) => current.filter((message) => message.id !== local));
      }
    });
  }

  function clear() {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await clearTutorConversation(lessonId);
      if (result.ok) setMessages([]);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg lg:hidden"
      >
        <MessageCircleQuestion aria-hidden="true" className="size-4" />
        Ask the tutor
      </button>

      <section
        aria-label="AI tutor"
        className={cn(
          "flex-col overflow-hidden bg-card lg:flex lg:h-[calc(100vh-3rem)] lg:max-h-[44rem] lg:rounded-xl lg:border",
          open ? "fixed inset-0 z-50 flex" : "hidden",
        )}
      >
        <header className="flex items-start justify-between gap-2 border-b p-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles aria-hidden="true" className="size-4 text-brand" />
              AI tutor
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Educational support for this lesson, not clinical advice. Your questions go to an AI provider, so
              please leave out personal or health details.
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            {messages.length > 0 ? (
              <Button variant="ghost" size="icon" onClick={clear} disabled={pending} aria-label="Delete conversation">
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close tutor"
              className="lg:hidden"
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {!connected ? (
            <p className="text-sm text-muted-foreground">
              The AI tutor is not connected yet. You can carry on with the lesson without it.
            </p>
          ) : messages.length === 0 ? (
            <div>
              <p className="text-sm text-muted-foreground">Ask anything about this lesson, or start with:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => ask(suggestion)}
                    disabled={pending}
                    className="rounded-full border px-3 py-1.5 text-left text-xs font-medium hover:border-brand"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="ml-6 rounded-lg bg-brand-soft p-3 text-sm">
                {message.content}
              </div>
            ) : (
              <div key={message.id} className="rounded-lg border p-3 text-sm [&_.leading-7]:leading-6">
                <LessonBody body={message.content} />
                <Sources message={message} courseSlug={courseSlug} />
              </div>
            ),
          )}

          {pending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Checking the course material
            </p>
          ) : null}
          <div ref={end} />
        </div>

        {connected ? (
          <form
            className="space-y-2 border-t p-3"
            onSubmit={(event) => {
              event.preventDefault();
              ask(question);
            }}
          >
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {messages.length > 0 ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {SUGGESTIONS.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => ask(suggestion)}
                    disabled={pending}
                    className="shrink-0 rounded-full border px-2.5 py-1 text-xs hover:border-brand"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={MAX_QUESTION_CHARACTERS}
              rows={2}
              placeholder="Ask about this lesson"
              aria-label="Your question"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask(question);
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as TutorLevel)}
                aria-label="Explanation level"
                className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
              >
                {TUTOR_LEVELS.map((value) => (
                  <option key={value} value={value}>
                    {COURSE_LEVEL_LABELS[value]}
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={pending || !question.trim()}>
                <Send aria-hidden="true" />
                Ask
              </Button>
            </div>
          </form>
        ) : null}
      </section>
    </>
  );
}
