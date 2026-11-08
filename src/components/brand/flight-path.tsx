import { cn } from "@/lib/utils";

/** The signature motif: a dashed flight path with waypoints, used on dark surfaces. */
export function FlightPath({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <path
        d="M-40 560 C 320 540, 640 380, 1240 70"
        fill="none"
        stroke="#9fbcff"
        strokeWidth="2"
        strokeDasharray="10 14"
        opacity="0.35"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M-40 420 C 360 420, 760 260, 1240 -20"
        fill="none"
        stroke="#9fbcff"
        strokeWidth="1"
        strokeDasharray="2 12"
        opacity="0.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
