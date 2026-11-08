import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { FlightPath } from "@/components/brand/flight-path";
import { cn } from "@/lib/utils";

/** The navy welcome band at the top of each dashboard. */
export function WelcomeBanner({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl bg-navy px-6 py-8 text-primary-foreground sm:px-10 sm:py-10">
      <FlightPath />
      <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.18em] text-sky uppercase">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl leading-relaxed text-[#b9c6dd]">{description}</p>
          {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </section>
  );
}

/** A ring that shows a share from 0 to 100, with the number in its centre. */
export function ProgressRing({ value, label }: { value: number; label: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative size-36"
    >
      <svg viewBox="0 0 120 120" aria-hidden="true" className="size-36 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#f08a3c"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-3xl font-bold">{clamped}%</span>
        <span className="text-xs text-[#b9c6dd]">{label}</span>
      </div>
    </div>
  );
}

export function StatCard({
  icon: Icon,
  value,
  label,
  tone = "brand",
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  tone?: "brand" | "warm";
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,30,58,0.04)]">
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-2xl",
          tone === "warm" ? "bg-warm-soft" : "bg-brand-soft",
        )}
      >
        <Icon aria-hidden="true" className={cn("size-6", tone === "warm" ? "text-warm-ink" : "text-brand")} />
      </span>
      <div className="min-w-0">
        <p className="font-heading text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_16px_32px_-20px_rgba(15,30,58,0.35)]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
        <Icon aria-hidden="true" className="size-5 text-brand" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold group-hover:text-brand">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
      />
    </Link>
  );
}
