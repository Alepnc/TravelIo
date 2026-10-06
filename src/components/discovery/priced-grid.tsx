import Link from "next/link";
import { MagnifyingGlass as Search } from "@phosphor-icons/react/dist/ssr";
import type { Destination } from "@/lib/types";
import { DestinationCard, DestinationCardSkeleton } from "./destination-card";
import { QuoteBreakdown } from "./quote-breakdown";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import { DepartureBoard, DepartureBoardSkeleton } from "./departure-board";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { isLikelyBot } from "@/server/security/request";
import { prioritizeDestinations, quoteDestinations, representativeDates, sortQuotes } from "@/server/services/discovery";

/**
 * Griglia di mete con il prezzo REALE del volo A/R (per 4 notti) dove disponibile.
 * Per non esaurire la quota del provider garantisce almeno `ensureKnown` prezzi noti (rileva solo i mancanti);
 * il resto si ottiene su richiesta (`moreHref`) o cercando il viaggio.
 */
export async function PricedGrid({ destinations, from, month, maxPrice, ensureKnown, moreHref, view = "grid" }: { destinations: Destination[]; from: string; month: number; maxPrice?: number; ensureKnown: number; moreHref: string; view?: "grid" | "board" }) {
  const { depart, ret } = representativeDates(month, 4);
  const bot = await isLikelyBot();
  const batch = await quoteDestinations(prioritizeDestinations(destinations, month), { from, depart, ret, ensureKnown: bot ? 0 : ensureKnown });
  const quotes = sortQuotes(batch.quotes, month)
    .filter((q) => q.flightStatus !== "none")
    // il tetto di spesa si applica solo dove il volo è noto: le altre non si possono giudicare
    .filter((q) => !maxPrice || q.totalEstimate == null || q.totalEstimate <= maxPrice);
  const pending = quotes.filter((q) => q.flightStatus === "pending").length;

  if (!quotes.length && !batch.error)
    return (
      <EmptyState
        title="Nessuna meta in questo budget"
        description="Prova ad alzare il budget o a cambiare mese: i prezzi variano molto con la stagione."
        action={<LinkButton href="/ispirazione" variant="outline">Mostra tutte le mete</LinkButton>}
      />
    );

  return (
    <div className="space-y-6">
      {batch.error && <ErrorState title="Prezzi non disponibili al momento" description={batch.error} />}
      <DataSourceBadge live={quotes.some((q) => q.flightStatus === "live")} />
      {view === "board" ? (
        <div className="board-panel px-4 py-4 sm:px-6 sm:py-5">
          <DepartureBoard quotes={quotes} from={from} month={month} hrefFor={(q) => `/cerca?from=${from}&to=${q.destination.id}&depart=${depart}&ret=${ret}&travelers=2`} />
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {quotes.map((q, i) => (
          <div key={q.destination.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            <DestinationCard
              destination={q.destination}
              price={q.flightPrice}
              priceLabel="volo A/R da"
              href={`/cerca?from=${from}&to=${q.destination.id}&depart=${depart}&ret=${ret}&travelers=2`}
              note={q.destination.bestMonths.includes(month) ? "Periodo ideale" : undefined}
              priority={i < 2}
            />
            <QuoteBreakdown quote={q} className="mt-1 text-xs text-muted" />
          </div>
        ))}
      </div>
      )}
      {pending > 0 && !batch.error && (
        <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-ink/25 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-prose text-sm text-muted">
            Abbiamo controllato i prezzi reali di {quotes.length - pending} mete. Per le altre {pending} il volo non è ancora stato rilevato: ogni controllo usa una ricerca del nostro piano.
          </p>
          <Link href={moreHref} scroll={false} className="press inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-board-text">
            <Search className="h-4 w-4" /> Rileva altri prezzi
          </Link>
        </div>
      )}
    </div>
  );
}

export function PricedGridSkeleton({ view = "grid" }: { view?: "grid" | "board" }) {
  if (view === "board")
    return (
      <div className="board-panel px-4 py-4 sm:px-6 sm:py-5">
        <DepartureBoardSkeleton rows={10} />
      </div>
    );
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <DestinationCardSkeleton key={i} />
      ))}
    </div>
  );
}
