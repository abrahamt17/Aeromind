import Link from "next/link";
import { cn } from "@/lib/utils";

/** The mark: a wing rising along a flight path, ending at a warm waypoint. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="#0f1e3a" />
      <path d="M7 22.5c5.5-.6 10-3.4 14.5-9.5" fill="none" stroke="#9fbcff" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 3.6" />
      <path d="M10.5 23 16.6 8.5 22.7 23h-3.6l-2.5-6.3-2.5 6.3z" fill="#f6f7f4" />
      <circle cx="23.5" cy="9" r="2.4" fill="#f08a3c" />
    </svg>
  );
}

export function Logo({ href = "/", tone = "dark" }: { href?: string; tone?: "dark" | "light" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg font-heading text-lg font-bold tracking-tight",
        tone === "light" ? "text-primary-foreground" : "text-foreground",
      )}
    >
      <LogoMark />
      <span>AeroMind</span>
    </Link>
  );
}
