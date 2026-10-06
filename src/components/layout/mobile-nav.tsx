"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Map, Search, Sparkles, User } from "lucide-react";
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
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden" aria-label="Navigazione mobile">
      <ul className="mx-auto flex max-w-md items-stretch justify-around pt-1.5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex w-16 flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-medium", active ? "text-brand-600" : "text-muted")}>
                <Icon className={cn("h-5 w-5 transition-transform duration-150", active && "scale-110")} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
