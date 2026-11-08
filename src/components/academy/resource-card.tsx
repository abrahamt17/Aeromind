import { ExternalLink } from "lucide-react";
import type { Resource } from "@/lib/data/academy";
import { RESOURCE_ACCESS_LABELS } from "@/lib/labels";

export function ResourceCard({ resource, action }: { resource: Resource; action?: React.ReactNode }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/80 bg-card p-5">
      <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        {RESOURCE_ACCESS_LABELS[resource.access]}
      </span>
      <h3 className="mt-3 font-semibold">{resource.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{resource.description}</p>
      <p className="mt-3 text-sm text-muted-foreground">{resource.author}</p>
      <p className="mt-1 text-xs text-muted-foreground">{resource.licence_note}</p>
      {resource.source_url ? (
        <a
          href={resource.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          Open at {resource.source_name}
          <ExternalLink aria-hidden="true" className="size-4" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </article>
  );
}
