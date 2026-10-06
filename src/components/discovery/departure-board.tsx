import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { DestinationQuote } from "@/server/services/discovery";
import { FlapText } from "@/components/ui/flap";
import { cn, formatPrice } from "@/lib/format";
import { monthName } from "@/lib/time";

const COLS = "grid grid-cols-[minmax(0,1fr)_auto_1.25rem] items-center gap-x-4 sm:grid-cols-[minmax(0,1.5fr)_4.5rem_minmax(0,1.1fr)_7rem_minmax(0,0.9fr)_1.25rem] lg:gap-x-6";

/**
 * Tabellone delle partenze: una riga per meta, con il prezzo reale del volo A/R dove è stato rilevato.
 * Le celle a palette ripartono a cascata quando cambiano mese o aeroporto (FlapText conserva lo stato tra i render).
 */
export function DepartureBoard({ quotes, from, month, hrefFor, className }: { quotes: DestinationQuote[]; from: string; month: number; hrefFor: (q: DestinationQuote) => string; className?: string }) {
  return (
    <div className={cn("text-board-text", className)}>
      <div className={cn(COLS, "col-label border-b border-board-frame pb-2 text-board-dim")} aria-hidden>
        <span>Destinazione</span>
        <span className="hidden sm:block">Scalo</span>
        <span className="hidden sm:block">Periodo ideale</span>
        <span className="text-right">A/R da {from}</span>
        <span className="hidden sm:block">Stato</span>
        <span />
      </div>
      <ol>
        {quotes.map((q, i) => {
          const d = q.destination;
          const ideal = d.bestMonths.includes(month);
          const live = q.flightStatus === "live" && q.flightPrice != null;
          const label = `${d.name}, ${d.country}. ${live ? `Volo andata e ritorno da ${formatPrice(q.flightPrice!)}` : "Prezzo del volo da rilevare"}${ideal ? ", periodo ideale" : ""}`;
          return (
            <li key={i} className="border-b border-board-frame/70 last:border-b-0">
              <Link href={hrefFor(q)} aria-label={label} className={cn(COLS, "group py-2.5 transition-colors duration-150 hoverable:hover:bg-board-frame/60 sm:py-3")}>
                <span className="min-w-0">
                  <FlapText text={d.name} length={11} className="text-[1.15rem] sm:text-[1.35rem]" delay={i * 70} />
                  <span className="mt-1 block truncate text-xs text-board-dim sm:hidden">
                    {d.country} · {d.airportCode}
                  </span>
                </span>
                <FlapText text={d.airportCode} length={3} className="hidden text-[1.15rem] sm:inline-flex sm:text-[1.35rem]" delay={i * 70 + 120} />
                <span className="flap hidden truncate text-sm text-board-dim sm:block">
                  {d.bestMonths.slice(0, 3).map((m) => (
                    <span key={m} className={cn("mr-2", m === month && "text-brand-500")}>
                      {monthName(m, true)}
                    </span>
                  ))}
                </span>
                <span className="flex justify-end">
                  {live ? (
                    <FlapText text={formatPrice(q.flightPrice!).replace(" ", "")} length={5} className="text-[1.15rem] sm:text-[1.35rem]" cellClassName="!text-brand-500" delay={i * 70 + 200} />
                  ) : (
                    <span className="flap text-right text-xs text-board-dim">Da rilevare</span>
                  )}
                </span>
                <span className={cn("flap hidden text-sm sm:block", ideal ? "text-brand-500" : "text-board-dim")}>{ideal ? "Periodo ideale" : live ? "Prezzo reale" : "In catalogo"}</span>
                <ArrowRight className="h-4 w-4 text-board-dim transition-[color,transform] duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-brand-500" weight="bold" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function DepartureBoardSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden>
      <div className="mb-3 h-3 w-40 skeleton-board" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-board-frame/70 py-3">
          <div className="h-7 w-48 skeleton-board" />
          <div className="ml-auto h-7 w-20 skeleton-board" />
        </div>
      ))}
    </div>
  );
}
