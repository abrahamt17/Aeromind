"use client";

import { Bookmark, BookmarkCheck, CheckCircle2, Circle } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setLessonComplete, setResourceSaved } from "@/lib/actions/academy";

export function CompleteLessonButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const [pending, startTransition] = useTransition();
  // Changes straight away, then settles on the saved value.
  const [shown, setShown] = useOptimistic(completed);

  return (
    <Button
      variant={shown ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setShown(!completed);
          await setLessonComplete(lessonId, !completed);
        })
      }
    >
      {shown ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
      {shown ? "Completed. Mark as not done" : "Mark lesson as complete"}
    </Button>
  );
}

export function SaveResourceButton({ resourceId, saved }: { resourceId: string; saved: boolean }) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(saved);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-pressed={shown}
      onClick={() =>
        startTransition(async () => {
          setShown(!saved);
          await setResourceSaved(resourceId, !saved);
        })
      }
    >
      {shown ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
      {shown ? "Saved" : "Save"}
    </Button>
  );
}
