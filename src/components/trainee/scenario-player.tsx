"use client";

import { CircleCheck, Plane } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui-kit";
import { completeScenario } from "@/lib/actions/trainee";
import type { ScenarioContent } from "@/lib/schemas/scenario";

type Choice = ScenarioContent["steps"][number]["choices"][number];

export function ScenarioPlayer({
  scenarioId,
  planItemId,
  content,
  backHref,
  backLabel,
}: {
  scenarioId: string;
  planItemId: string | null;
  content: ScenarioContent;
  backHref: string;
  backLabel: string;
}) {
  const [stepId, setStepId] = useState(content.startStepId);
  const [selected, setSelected] = useState<Choice | null>(null);
  const [history, setHistory] = useState<{ stepId: string; choiceId: string }[]>([]);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const stepIndex = content.steps.findIndex((step) => step.id === stepId);
  const step = content.steps[stepIndex];

  function save(choices: { stepId: string; choiceId: string }[]) {
    setFailed(false);
    startTransition(async () => {
      const result = await completeScenario({ scenarioId, planItemId, choices });
      if (result.ok) setFinished(true);
      else setFailed(true);
    });
  }

  function next() {
    if (!selected) return;

    const choices = [...history, { stepId, choiceId: selected.id }];
    setHistory(choices);

    if (selected.nextStepId) {
      setStepId(selected.nextStepId);
      setSelected(null);
    } else {
      save(choices);
    }
  }

  if (finished) {
    return (
      <section className="rounded-xl border bg-card p-6 text-center">
        <CircleCheck aria-hidden="true" className="mx-auto size-8 text-brand" />
        <h2 className="mt-3 text-xl font-semibold">Scenario complete</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Your learning progress has been updated. This records that you completed the activity, not how you would
          perform in flight.
        </p>
        {content.reflection ? (
          <div className="mx-auto mt-4 max-w-md rounded-lg bg-muted p-4 text-left">
            <h3 className="text-sm font-semibold">Reflect</h3>
            <p className="mt-1 text-sm text-muted-foreground">{content.reflection}</p>
          </div>
        ) : null}
        {content.references?.length ? (
          <ul className="mx-auto mt-4 max-w-md text-left text-sm">
            {content.references.map((reference) => (
              <li key={reference.url}>
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand underline-offset-4 hover:underline"
                >
                  {reference.title}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5">
          <LinkButton href={backHref}>{backLabel}</LinkButton>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-brand">
        <Plane aria-hidden="true" className="size-4" />
        Decision {stepIndex + 1} of {content.steps.length}
      </div>
      {content.context && stepIndex === 0 ? (
        <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{content.context}</p>
      ) : null}
      <p className="mt-3 text-lg">{step.situation}</p>

      <div className="mt-5 space-y-2.5" role="group" aria-label="Your options">
        {step.choices.map((choice) => {
          const isSelected = selected?.id === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              aria-pressed={isSelected}
              disabled={Boolean(selected)}
              onClick={() => setSelected(choice)}
              className={`w-full rounded-lg border p-3.5 text-left text-sm font-medium transition-colors ${
                isSelected ? "border-brand bg-brand-soft" : "bg-card enabled:hover:border-brand disabled:opacity-60"
              }`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-5" aria-live="polite">
          <div className="rounded-lg bg-muted p-4">
            <h2 className="text-sm font-semibold">Things to consider</h2>
            <p className="mt-1 text-sm text-muted-foreground">{selected.feedback}</p>
          </div>
          {failed ? (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>We could not save your progress. Please try again.</AlertDescription>
            </Alert>
          ) : null}
          <Button className="mt-4" onClick={failed ? () => save(history) : next} disabled={pending}>
            {failed ? "Try again" : selected.nextStepId ? "Next decision" : "Finish scenario"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
