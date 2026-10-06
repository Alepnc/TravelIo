"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route, Wallet } from "lucide-react";
import { cn } from "@/lib/format";

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/viaggi/${tripId}`, label: "Panoramica", icon: LayoutDashboard, exact: true },
    { href: `/viaggi/${tripId}/itinerario`, label: "Itinerario", icon: Route },
    { href: `/viaggi/${tripId}/budget`, label: "Budget", icon: Wallet },
  ];
  return (
    <nav className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Sezioni del viaggio">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-2 border-b-2 px-2.5 py-3 sm:px-3 text-sm font-semibold transition-colors duration-150", active ? "border-brand-500 text-ink" : "border-transparent text-muted hoverable:hover:text-ink")}>
            <t.icon className="hidden h-4 w-4 sm:block" /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
