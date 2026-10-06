/** Ottimizzazioni pure sull'itinerario (usate dal Travel Optimizer). */
import type { ItineraryDay } from "../types";
import { travelBetween } from "./reflow";

const MOVABLE = new Set(["attrazione", "museo", "natura", "shopping", "esperienza"]);

export interface ActivityMove {
  saving: number;
  activityId: string;
  title: string;
  toDayId: string;
  toIdx: number;
  index: number;
}

/**
 * Per ogni attività spostabile calcola quanto spostamento si risparmia togliendola dalla sua giornata
 * e inserendola nel punto migliore di un'altra. Restituisce la mossa migliore se vale almeno `minSaving` minuti.
 */
export function bestActivityMove(days: ItineraryDay[], minSaving = 20): ActivityMove | null {
  // cast: TS non vede le assegnazioni nelle callback e restringerebbe a `null`
  let best = null as ActivityMove | null;
  for (const day of days) {
    day.activities.forEach((a, i) => {
      if (!MOVABLE.has(a.category) || a.timeLocked || a.lat == null) return;
      const prev = day.activities[i - 1] ?? null;
      const next = day.activities[i + 1] ?? null;
      const removal = travelBetween(prev, a) + (next ? travelBetween(a, next) - travelBetween(prev, next) : 0);
      for (const other of days) {
        if (other.id === day.id) continue;
        const busy = other.activities.reduce((s, x) => s + x.durationMin, 0);
        if (busy + a.durationMin > 11 * 60) continue;
        // Solo tra due tappe esistenti: mai prima dell'arrivo né dopo la partenza
        for (let j = 1; j < other.activities.length; j++) {
          const p = other.activities[j - 1];
          const n = other.activities[j];
          if (n.category === "volo" || n.category === "trasporto") continue;
          const saving = removal - (travelBetween(p, a) + travelBetween(a, n) - travelBetween(p, n));
          if (!best || saving > best.saving) best = { saving, activityId: a.id, title: a.title, toDayId: other.id, toIdx: other.dayIndex, index: j };
        }
      }
    });
  }
  return best && best.saving >= minSaving ? best : null;
}
