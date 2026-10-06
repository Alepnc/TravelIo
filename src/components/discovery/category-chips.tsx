import Link from "next/link";
import { CATEGORY_META } from "@/server/mock-data/destinations";
import { cn } from "@/lib/format";
import { CATEGORY_ICON } from "./category-icon";

export const CATEGORY_ORDER = ["weekend", "mare", "avventura", "nightlife", "natura", "cultura", "citta", "economici"] as const;

const chip = "press flex h-10 shrink-0 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold transition-colors duration-150";

export function CategoryChips({ active, hrefFor, extra }: { active?: string; hrefFor: (key: string) => string; extra?: { href: string; label: string; active?: boolean }[] }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {CATEGORY_ORDER.map((key) => {
        const meta = CATEGORY_META[key];
        const Icon = CATEGORY_ICON[key];
        const isActive = active === key;
        return (
          <Link key={key} href={hrefFor(key)} scroll={false} aria-current={isActive ? "true" : undefined} className={cn(chip, isActive ? "border-ink bg-ink text-board-text" : "border-ink/15 bg-surface hoverable:hover:border-ink/50")}>
            <Icon className={cn("h-4 w-4", isActive ? "text-brand-500" : "text-ink-soft")} weight={isActive ? "fill" : "regular"} aria-hidden /> {meta.label}
          </Link>
        );
      })}
      {extra?.map((e) => (
        <Link key={e.href} href={e.href} scroll={false} className={cn(chip, e.active ? "border-ink bg-ink text-board-text" : "border-ink/15 bg-surface hoverable:hover:border-ink/50")}>
          {e.label}
        </Link>
      ))}
    </div>
  );
}
