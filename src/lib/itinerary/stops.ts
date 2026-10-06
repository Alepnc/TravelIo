import type { ItineraryActivity } from "../types";

export interface MapStop {
  number: number;
  lat: number;
  lng: number;
  title: string;
  category: ItineraryActivity["category"];
  activityIds: string[];
}

/**
 * Tappe numerate per la mappa, nell'ordine della giornata.
 * Attività consecutive nello stesso luogo (es. trasferimento → check-in in hotel) diventano una sola tappa.
 */
export function mapStops(activities: ItineraryActivity[]): { stops: MapStop[]; numberOf: Map<string, number> } {
  const stops: MapStop[] = [];
  const numberOf = new Map<string, number>();
  for (const a of activities) {
    if (a.lat == null || a.lng == null) continue;
    const last = stops.at(-1);
    if (last && Math.abs(last.lat - a.lat) < 0.0005 && Math.abs(last.lng - a.lng) < 0.0005) {
      last.activityIds.push(a.id);
      numberOf.set(a.id, last.number);
      continue;
    }
    const stop = { number: stops.length + 1, lat: a.lat, lng: a.lng, title: a.title, category: a.category, activityIds: [a.id] };
    stops.push(stop);
    numberOf.set(a.id, stop.number);
  }
  return { stops, numberOf };
}
