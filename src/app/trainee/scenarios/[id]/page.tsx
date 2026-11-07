import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { SampleLabel } from "@/components/brand/sample-label";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { ScenarioPlayer } from "@/components/trainee/scenario-player";
import { PageHeader } from "@/components/ui-kit";
import { requireRole } from "@/lib/auth/session";
import { getScenario } from "@/lib/data/development";

export const metadata: Metadata = { title: "Scenario" };

async function Scenario({ params, searchParams }: PageProps<"/trainee/scenarios/[id]">) {
  const user = await requireRole("trainee");
  const { id } = await params;
  const { item } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const planItem = z.uuid().safeParse(item);
  const scenario = await getScenario(user.id, id, planItem.success ? planItem.data : null);
  if (!scenario) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <SampleLabel className="mb-3">Illustrative scenario</SampleLabel>
      <PageHeader title={scenario.title} description={scenario.summary} />
      <ScenarioPlayer scenarioId={scenario.id} planItemId={scenario.plan_item_id} content={scenario.content} />
      <p className="mt-4 text-sm text-muted-foreground">
        This is educational practice, not flight instruction or an assessment. Your choices are not scored.
      </p>
    </div>
  );
}

export default function TraineeScenarioPage(props: PageProps<"/trainee/scenarios/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Scenario {...props} />
    </Suspense>
  );
}
