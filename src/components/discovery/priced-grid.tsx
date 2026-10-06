import Link from "next/link";
import { Search } from "lucide-react";
import type { Destination } from "@/lib/types";
import { DestinationCard, DestinationCardSkeleton } from "./destination-card";
import { QuoteBreakdown } from "./quote-breakdown";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { isLikelyBot } from "@/server/security/request";
import { prioritizeDestinations, quoteDestinations, representativeDates, sortQuotes } from "@/server/services/discovery";

/**
 * Griglia di mete con il prezzo REALE del volo A/R (per 4 notti) dove disponibile.
 * Per non esaurire la quota del provider garantisce almeno `ensureKnown` prezzi noti (rileva solo i mancanti);
 * il resto si ottiene su richiesta (`moreHref`) o cercando il viaggio.
 */
export async function PricedGrid({ destinations, from, month, maxPrice, ensureKnown, moreHref }: { destinations: Destination[]; from: string; month: number; maxPrice?: number; ensureKnown: number; moreHref: string }) {
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
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
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
            <QuoteBreakdown quote={q} className="mt-1 px-1 text-xs text-muted" />
          </div>
        ))}
      </div>
      {pending > 0 && !batch.error && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-5 text-center">
          <p className="text-sm text-muted">
            Abbiamo controllato i prezzi reali di {quotes.length - pending} mete. Per le altre {pending} il volo non è ancora stato rilevato: ogni controllo usa una ricerca del nostro piano.
          </p>
          <Link href={moreHref} scroll={false} className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white">
            <Search className="h-4 w-4" /> Rileva altri prezzi
          </Link>
        </div>
      )}
    </div>
  );
}

export function PricedGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <DestinationCardSkeleton key={i} />
      ))}
    </div>
  );
}
