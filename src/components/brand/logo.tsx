import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-md font-semibold tracking-tight">
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7">
        <rect width="32" height="32" rx="7" className="fill-primary" />
        <path d="M16 7 25 25h-4.4L16 15.6 11.4 25H7z" fill="#fff" />
        <path d="M12.8 21h6.4l-1.5 3h-3.4z" fill="#7fb0ec" />
      </svg>
      <span className="text-lg">AeroMind</span>
    </Link>
  );
}
