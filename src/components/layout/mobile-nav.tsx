"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MapTrifold as Map, MagnifyingGlass as Search, Sparkle as Sparkles, User } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/format";

const TABS = [
  { href: "/cerca", label: "Esplora", icon: Search },
  { href: "/ispirazione", label: "Ispirazione", icon: Sparkles },
  { href: "/viaggi", label: "Viaggi", icon: Map },
  { href: "/prezzi", label: "Prezzi", icon: Compass },
  { href: "/profilo", label: "Profilo", icon: User },
];

/** Tab bar nativa su mobile: la navigazione sta dove arriva il pollice. */
export function MobileNav() {
  const pathname = usePathname();
  // Nel builder di itinerario la barra inferiore è dedicata ai controlli del giorno
  if (/^\/viaggi\/[^/]+\/itinerario/.test(pathname)) return null;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-board-frame bg-board md:hidden" aria-label="Navigazione mobile">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex w-16 flex-col items-center gap-1 pb-1 pt-2.5 text-[11px] font-medium before:absolute before:inset-x-3 before:top-0 before:h-[3px]", active ? "text-brand-500 before:bg-brand-500" : "text-board-dim")}>
                <Icon className="h-5 w-5" weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
