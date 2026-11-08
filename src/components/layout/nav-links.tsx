"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

/** The navigation itself. `pathname` marks the current section; empty marks none. */
export function NavLinksView({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav aria-label="Main" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
      {items.map((item) => {
        const active = pathname !== "" && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative shrink-0 px-3 py-3 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-colors",
                active ? "bg-brand" : "bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

/** Reads the address, so it must sit inside a Suspense boundary. */
export function NavLinks({ items }: { items: NavItem[] }) {
  return <NavLinksView items={items} pathname={usePathname()} />;
}
