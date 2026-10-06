import { addDays, todayISO } from "@/lib/time";

export { addDays };

/** Data di partenza suggerita per un viaggio creato dall'assistente: tra tre settimane, di giovedì. */
export function representativeStart(): string {
  let d = addDays(todayISO(), 21);
  while (new Date(`${d}T00:00:00Z`).getUTCDay() !== 4) d = addDays(d, 1);
  return d;
}
