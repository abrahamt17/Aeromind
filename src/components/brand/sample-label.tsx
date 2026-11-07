import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marks synthetic content. Use it on every sample professional, report and plan. */
export function SampleLabel({
  children = "Sample",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-sample-soft px-2.5 py-0.5 text-xs font-medium text-sample",
        className,
      )}
    >
      <FlaskConical aria-hidden="true" className="size-3" />
      {children}
    </span>
  );
}
