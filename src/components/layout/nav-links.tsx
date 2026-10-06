"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden h-14 items-stretch gap-1 md:flex" aria-label="Principale">
      {links.map((l) => {
        const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center px-3 text-sm font-medium transition-colors duration-150 after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:transition-colors",
              active ? "text-white after:bg-brand-500" : "text-board-dim after:bg-transparent hoverable:hover:text-white",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
