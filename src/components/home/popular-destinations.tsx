import { DepartureBoard, DepartureBoardSkeleton } from "@/components/discovery/departure-board";
import { listDestinations, quoteDestinations, representativeDates } from "@/server/services/discovery";

const POPULAR = ["barcellona", "lisbona", "budapest", "amsterdam", "atene", "praga", "malta", "tokyo"];

/**
 * La home non spende quota: mostra il prezzo del volo solo dove è già stato rilevato di recente
 * (ricerche degli utenti, pagine Ispirazione e Prezzi). Le altre righe portano alla ricerca.
 * Le mete nel loro periodo ideale salgono in cima al tabellone.
 */
export async function PopularDestinations({ from, month }: { from: string; month: number }) {
  const all = await listDestinations();
  const { depart, ret } = representativeDates(month, 4);
  const list = POPULAR.map((id) => all.find((d) => d.id === id)!)
    .filter(Boolean)
    .sort((a, b) => Number(b.bestMonths.includes(month)) - Number(a.bestMonths.includes(month)));
  const { quotes } = await quoteDestinations(list, { from, depart, ret, ensureKnown: 0 });
  return <DepartureBoard quotes={quotes} from={from} month={month} hrefFor={(q) => `/cerca?from=${from}&to=${q.destination.id}&depart=${depart}&ret=${ret}&travelers=2`} />;
}

export function PopularDestinationsSkeleton() {
  return <DepartureBoardSkeleton rows={8} />;
}
