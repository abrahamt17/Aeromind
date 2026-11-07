"use client";

import { useTransition } from "react";
import { LinkButton } from "@/components/ui-kit";
import { togglePlanItem } from "@/lib/actions/trainee";
import { PLAN_ITEM_LABELS } from "@/lib/labels";
import type { PlanItem } from "@/lib/data/development";

export function PlanItemRow({ item }: { item: PlanItem }) {
  const [pending, startTransition] = useTransition();
  const done = Boolean(item.completed_at);

  return (
    <li className="flex gap-3 p-4 sm:px-5">
      <input
        type="checkbox"
        checked={done}
        disabled={pending}
        aria-label={`Mark "${item.title}" as ${done ? "not done" : "done"}`}
        onChange={(event) => {
          const checked = event.target.checked;
          startTransition(() => togglePlanItem(item.id, checked));
        }}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-[var(--brand)]"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-brand">{PLAN_ITEM_LABELS[item.item_type]}</p>
        <p className={done ? "font-medium text-muted-foreground line-through" : "font-medium"}>{item.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
        {item.scenario_id ? (
          <div className="mt-3">
            <LinkButton href={`/trainee/scenarios/${item.scenario_id}?item=${item.id}`} variant="outline" size="sm">
              {done ? "Practise again" : "Start scenario"}
            </LinkButton>
          </div>
        ) : null}
      </div>
    </li>
  );
}
