import { Info } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SampleLabel } from "@/components/brand/sample-label";
import { ActionForm, CheckboxField } from "@/components/forms/action-form";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { PlanItemRow } from "@/components/trainee/plan-item-row";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState, LinkButton, PageHeader, Panel } from "@/components/ui-kit";
import { generatePlan, withdrawAiConsent } from "@/lib/actions/trainee";
import { TEMPLATE_MODEL } from "@/lib/ai/template";
import { requireRole } from "@/lib/auth/session";
import { type DevelopmentEntry, getDevelopment } from "@/lib/data/development";
import { COMPETENCIES } from "@/lib/labels";

export const metadata: Metadata = { title: "Development" };

function planOrigin(model: string | null): string {
  if (model === TEMPLATE_MODEL) return "Built from pre-written learning content. No AI provider was used.";
  if (model === "pre-generated-sample") return "Pre-generated sample plan.";
  return "Generated with AI from recommendations your professional approved.";
}

function NewPlan({ entry }: { entry: DevelopmentEntry }) {
  if (entry.approved_recommendations.length === 0) {
    return (
      <Panel title={`From your assessment with ${entry.professional_name}`}>
        <p className="text-sm text-muted-foreground">
          Your professional has not approved any recommendations for a development plan.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Create your development plan"
      description={`${entry.professional_name} approved these topics for educational use.`}
    >
      <ul className="mb-5 space-y-3">
        {entry.approved_recommendations.map((recommendation) => (
          <li key={recommendation.id} className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{COMPETENCIES[recommendation.competency]}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{recommendation.educational_summary}</p>
          </li>
        ))}
      </ul>
      <ActionForm action={generatePlan.bind(null, entry.request_id)} submitLabel="Create my plan">
        <CheckboxField
          name="consent"
          label="I agree that these summaries, my training stage and my language can be used to create my plan, including by an AI provider if one is connected. My name, questionnaire answers and full report are not shared. I can withdraw this consent at any time."
        />
      </ActionForm>
    </Panel>
  );
}

function ExistingPlan({ entry }: { entry: DevelopmentEntry }) {
  const plan = entry.plan!;
  const completed = plan.items.filter((item) => item.completed_at).length;

  return (
    <div className="space-y-4">
      <Panel>
        {plan.is_sample ? <SampleLabel className="mb-3">Sample plan</SampleLabel> : null}
        <h2 className="text-xl font-semibold">{plan.title}</h2>
        <p className="mt-1 text-muted-foreground">{plan.summary}</p>
        <p className="mt-3 text-sm text-muted-foreground">{planOrigin(plan.model)}</p>
        <p className="mt-1 text-sm font-medium" role="status">
          {completed} of {plan.items.length} activities completed
        </p>
      </Panel>

      <ul className="divide-y rounded-xl border bg-card">
        {plan.items.map((item) => (
          <PlanItemRow key={item.id} item={item} />
        ))}
      </ul>

      <Panel title="Want to talk it through?" description="Arrange a follow-up with your professional at any time.">
        <LinkButton href={`/professionals/${entry.professional_id}`} variant="outline">
          Contact {entry.professional_name}
        </LinkButton>
      </Panel>

      {entry.has_ai_consent ? (
        <Panel
          title="Your consent"
          description="Withdrawing stops new plans from being generated. This plan stays available to you."
        >
          <ActionForm
            action={withdrawAiConsent.bind(null, entry.request_id)}
            submitLabel="Withdraw consent"
            submitVariant="outline"
          />
        </Panel>
      ) : null}
    </div>
  );
}

async function Development() {
  const user = await requireRole("trainee");
  const entries = await getDevelopment(user.id);

  return (
    <>
      <PageHeader
        title="Your development"
        description="Educational activities based on recommendations your professional approved."
      />

      <Alert className="mb-6">
        <Info aria-hidden="true" />
        <AlertDescription>
          This content is educational, not clinical. It does not diagnose, assess fitness to fly or demonstrate
          psychological improvement. Speak to your professional if you would like support.
        </AlertDescription>
      </Alert>

      {entries.length === 0 ? (
        <EmptyState
          title="No development plan yet"
          description="Your plan becomes available after your professional releases a report."
          action={<LinkButton href="/trainee/dashboard" variant="outline">Back to dashboard</LinkButton>}
        />
      ) : (
        <div className="space-y-8">
          {entries.map((entry) =>
            entry.plan ? (
              <ExistingPlan key={entry.request_id} entry={entry} />
            ) : (
              <NewPlan key={entry.request_id} entry={entry} />
            ),
          )}
        </div>
      )}
    </>
  );
}

export default function TraineeDevelopmentPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Development />
    </Suspense>
  );
}
