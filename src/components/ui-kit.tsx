import { ArrowRight, Inbox } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ASSESSMENT_STATUSES, type AssessmentStatus, formatDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold tracking-[0.18em] text-brand uppercase", className)}>{children}</p>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,30,58,0.04),0_8px_24px_-12px_rgba(15,30,58,0.08)] sm:p-7",
        className,
      )}
    >
      {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {children ? <div className={title || description ? "mt-4" : undefined}>{children}</div> : null}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-input bg-card/70 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft">
        <Inbox aria-hidden="true" className="size-6 text-brand" />
      </span>
      <h2 className="mt-3 font-medium">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

const STATUS_STYLES: Record<AssessmentStatus, string> = {
  requested: "bg-sample-soft text-sample",
  accepted: "bg-brand-soft text-brand",
  questionnaire_submitted: "bg-brand-soft text-brand",
  in_review: "bg-brand-soft text-brand",
  report_released: "bg-primary text-primary-foreground",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: AssessmentStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
      {ASSESSMENT_STATUSES[status]}
    </span>
  );
}

export function RequestList({
  requests,
  basePath,
}: {
  requests: { id: string; status: AssessmentStatus; created_at: Date; counterpart_name: string }[];
  basePath: string;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,30,58,0.04)]">
      {requests.map((request) => (
        <li key={request.id}>
          <Link
            href={`${basePath}/${request.id}`}
            className="group flex items-center gap-4 p-4 transition-colors hover:bg-brand-soft/40 sm:px-6"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{request.counterpart_name}</p>
              <p className="text-sm text-muted-foreground">Requested {formatDate(request.created_at)}</p>
            </div>
            <StatusBadge status={request.status} />
            <ArrowRight
              aria-hidden="true"
              className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand sm:block"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LinkButton({
  href,
  children,
  ...props
}: { href: string; children: React.ReactNode } & Omit<React.ComponentProps<typeof Button>, "render">) {
  return (
    <Button nativeButton={false} render={<Link href={href} />} {...props}>
      {children}
    </Button>
  );
}
