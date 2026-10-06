"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Principale">
      {links.map((l) => {
        const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn("rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150", active ? "bg-ink/5 text-ink" : "text-muted hoverable:hover:text-ink")}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
