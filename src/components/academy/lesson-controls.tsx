"use client";

import { Bookmark, BookmarkCheck, CheckCircle2, Circle } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setLessonComplete, setResourceSaved } from "@/lib/actions/academy";

export function CompleteLessonButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={completed ? "outline" : "default"}
      disabled={pending}
      onClick={() => startTransition(() => setLessonComplete(lessonId, !completed))}
    >
      {completed ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
      {completed ? "Completed. Mark as not done" : "Mark lesson as complete"}
    </Button>
  );
}

export function SaveResourceButton({ resourceId, saved }: { resourceId: string; saved: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-pressed={saved}
      onClick={() => startTransition(() => setResourceSaved(resourceId, !saved))}
    >
      {saved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
