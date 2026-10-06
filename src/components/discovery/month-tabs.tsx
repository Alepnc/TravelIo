import Link from "next/link";
import { cn } from "@/lib/format";
import { monthName } from "@/lib/time";

/** Selettore del mese come una riga di palette: il mese scelto è l'unica cella in ambra. */
export function MonthTabs({ month, hrefFor, months = Array.from({ length: 12 }, (_, i) => i + 1), label = "Mese" }: { month: number; hrefFor: (m: number) => string; months?: number[]; label?: string }) {
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="inline-flex gap-px rounded-md bg-board p-1">
        {months.map((m) => (
          <li key={m}>
            <Link
              href={hrefFor(m)}
              scroll={false}
              aria-current={m === month ? "true" : undefined}
              className={cn("flap block rounded-xs px-2.5 py-1.5 text-sm transition-colors duration-150", m === month ? "bg-brand-500 text-ink" : "bg-board-cell text-board-dim hoverable:hover:text-board-text")}
            >
              {monthName(m, true)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
