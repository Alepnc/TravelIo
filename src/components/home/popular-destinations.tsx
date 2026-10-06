import { DestinationCard, DestinationCardSkeleton } from "@/components/discovery/destination-card";
import { listDestinations, quoteDestinations, representativeDates } from "@/server/services/discovery";

const POPULAR = ["barcellona", "lisbona", "budapest", "amsterdam", "atene", "tokyo", "praga", "malta"];

/**
 * La home non spende quota: mostra il prezzo del volo solo dove è già stato rilevato di recente
 * (ricerche degli utenti, pagine Ispirazione e Prezzi). Le altre card portano alla ricerca.
 */
export async function PopularDestinations({ from }: { from: string }) {
  const all = await listDestinations();
  const nextMonth = ((new Date().getMonth() + 1) % 12) + 1;
  const { depart, ret } = representativeDates(nextMonth, 4);
  const list = POPULAR.map((id) => all.find((d) => d.id === id)!).filter(Boolean);
  const { quotes } = await quoteDestinations(list, { from, depart, ret, ensureKnown: 0 });
  return (
    <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {quotes.map((q, i) => (
        <div key={q.destination.id} className="w-[72vw] shrink-0 snap-start sm:w-auto" style={{ animationDelay: `${i * 50}ms` }}>
          <DestinationCard
            destination={q.destination}
            price={q.flightPrice}
            priceLabel="volo A/R da"
            href={`/cerca?from=${from}&to=${q.destination.id}&depart=${depart}&ret=${ret}&travelers=2`}
            priority={i < 2}
          />
        </div>
      ))}
    </div>
  );
}

export function PopularDestinationsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <DestinationCardSkeleton key={i} />
      ))}
    </div>
  );
}
