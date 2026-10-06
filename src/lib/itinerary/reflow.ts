/**
 * Ricalcolo degli orari di una giornata dopo un riordino o uno spostamento.
 * Condiviso tra client (aggiornamento ottimistico istantaneo) e server (persistenza),
 * così la UI e il database producono sempre lo stesso risultato.
 *
 * Regole:
 *  - le attività con `timeLocked` (voli, orari fissati a mano) non si spostano;
 *  - le altre partono appena finita la precedente + tempo di spostamento + piccolo margine;
 *  - la prima attività mantiene l'orario di inizio della giornata.
 */
import { estimateTravel } from "../geo";
import { ceil5, fromMinutes, toMinutes } from "../time";

export interface ReflowItem {
  id: string;
  startTime: string;
  durationMin: number;
  lat: number | null;
  lng: number | null;
  timeLocked: boolean;
  travelMinFromPrev: number | null;
  category?: string;
}

const BUFFER = 10;

export function travelBetween(a: Pick<ReflowItem, "lat" | "lng"> | null, b: Pick<ReflowItem, "lat" | "lng">): number {
  if (!a || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0;
  return estimateTravel({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }).minutes;
}

export function reflowDay<T extends ReflowItem>(items: T[], dayStart?: string): T[] {
  if (!items.length) return items;
  const firstStart = dayStart ?? items[0].startTime;
  let cursor = toMinutes(firstStart);
  let prev: T | null = null;
  return items.map((item, i) => {
    // Il trasferimento è esso stesso uno spostamento: niente tempo aggiuntivo
    const isTransfer = item.category === "trasporto" || item.category === "volo";
    const travel = i === 0 || isTransfer ? null : travelBetween(prev, item);
    let start: number;
    if (item.timeLocked) start = toMinutes(item.startTime);
    else if (i === 0) start = toMinutes(firstStart);
    else start = ceil5(cursor + (travel ?? 0));
    cursor = start + item.durationMin + BUFFER;
    prev = item;
    return { ...item, startTime: fromMinutes(start), travelMinFromPrev: travel };
  });
}

/** Segnala sovrapposizioni dovute ad attività con orario bloccato */
export function findConflicts(items: ReflowItem[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 1; i < items.length; i++) {
    const prevEnd = toMinutes(items[i - 1].startTime) + items[i - 1].durationMin;
    if (toMinutes(items[i].startTime) < prevEnd) {
      conflicts.add(items[i].id);
      conflicts.add(items[i - 1].id);
    }
  }
  return conflicts;
}

/** Minuti totali di spostamento in una sequenza di tappe */
export function totalTravel(points: Pick<ReflowItem, "lat" | "lng">[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) sum += travelBetween(points[i - 1], points[i]);
  return sum;
}
