import Link from "next/link";
import { CATEGORY_META } from "@/server/mock-data/destinations";
import { cn } from "@/lib/format";

export const CATEGORY_ORDER = ["weekend", "mare", "avventura", "nightlife", "natura", "cultura", "citta", "economici"] as const;

export function CategoryChips({ active, hrefFor, extra }: { active?: string; hrefFor: (key: string) => string; extra?: { href: string; label: string; active?: boolean }[] }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {CATEGORY_ORDER.map((key) => {
        const meta = CATEGORY_META[key];
        const isActive = active === key;
        return (
          <Link key={key} href={hrefFor(key)} scroll={false} aria-current={isActive ? "true" : undefined} className={cn("press flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150", isActive ? "border-ink bg-ink text-white" : "border-line bg-surface hoverable:hover:border-ink/30")}>
            <span aria-hidden>{meta.emoji}</span> {meta.label}
          </Link>
        );
      })}
      {extra?.map((e) => (
        <Link key={e.href} href={e.href} scroll={false} className={cn("press flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold", e.active ? "border-ink bg-ink text-white" : "border-line bg-surface hoverable:hover:border-ink/30")}>
          {e.label}
        </Link>
      ))}
    </div>
  );
}
