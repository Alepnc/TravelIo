/**
 * Calcolo del budget: funzione pura, usata dal server (optimizer, dashboard) e dal client
 * (aggiornamento immediato quando si modifica l'itinerario o si aggiunge una spesa).
 */
import type { TripDetail } from "./dto";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "./types";
import { diffDays } from "./time";

export interface BudgetLine {
  category: ExpenseCategory;
  label: string;
  emoji: string;
  /** Costo stimato per il gruppo (da voli, alloggio, itinerario o medie della destinazione) */
  estimated: number;
  /** Speso davvero (spese registrate) */
  actual: number;
  /** true se la stima è una media della destinazione e non deriva da scelte concrete */
  isRough: boolean;
}

export interface BudgetSummary {
  lines: BudgetLine[];
  plannedTotal: number | null;
  estimatedTotal: number;
  actualTotal: number;
  perPerson: number;
  dailyAverage: number;
  days: number;
  nights: number;
  travelers: number;
  /** Quota del budget usata dalla stima (0-1+) */
  usage: number | null;
  overBy: number;
}

const LOCAL_TRANSPORT_PER_DAY = 6;

export function computeBudget(trip: Pick<TripDetail, "flights" | "stay" | "itinerary" | "expenses" | "travelersCount" | "budgetPerPerson" | "startDate" | "endDate" | "destinationDailyCost">): BudgetSummary {
  const travelers = trip.travelersCount;
  const nights = Math.max(0, diffDays(trip.startDate, trip.endDate));
  const days = nights + 1;
  const acts = trip.itinerary?.days.flatMap((d) => d.activities) ?? [];
  const sum = (filter: (c: string) => boolean) => acts.filter((a) => filter(a.category)).reduce((s, a) => s + a.cost, 0) * travelers;

  const est: Record<ExpenseCategory, { value: number; rough: boolean }> = {
    voli: { value: trip.flights.reduce((s, f) => s + f.pricePerPerson, 0) * travelers, rough: false },
    alloggio: trip.stay
      ? { value: trip.stay.priceTotal, rough: false }
      : { value: 0, rough: true },
    trasporti: { value: sum((c) => c === "trasporto") + LOCAL_TRANSPORT_PER_DAY * days * travelers, rough: !acts.length },
    attivita: { value: sum((c) => !["ristorante", "trasporto", "volo", "alloggio"].includes(c)), rough: !acts.length },
    cibo: acts.length
      ? { value: sum((c) => c === "ristorante") + 6 * days * travelers, rough: false } // + colazioni
      : { value: Math.round(trip.destinationDailyCost * 0.65 * days * travelers), rough: true },
    altro: { value: 0, rough: false },
  };

  const actualBy = new Map<ExpenseCategory, number>();
  for (const e of trip.expenses) actualBy.set(e.category, (actualBy.get(e.category) ?? 0) + e.amount);

  const lines: BudgetLine[] = EXPENSE_CATEGORIES.map((c) => ({
    category: c.key,
    label: c.label,
    emoji: c.emoji,
    estimated: Math.round(est[c.key].value),
    actual: Math.round(actualBy.get(c.key) ?? 0),
    isRough: est[c.key].rough,
  }));

  // Il totale previsto usa, per categoria, il valore più alto tra stima e speso
  const estimatedTotal = lines.reduce((s, l) => s + Math.max(l.estimated, l.actual), 0);
  const actualTotal = lines.reduce((s, l) => s + l.actual, 0);
  const plannedTotal = trip.budgetPerPerson ? trip.budgetPerPerson * travelers : null;

  return {
    lines,
    plannedTotal,
    estimatedTotal,
    actualTotal,
    perPerson: Math.round(estimatedTotal / travelers),
    dailyAverage: Math.round(estimatedTotal / days),
    days,
    nights,
    travelers,
    usage: plannedTotal ? estimatedTotal / plannedTotal : null,
    overBy: plannedTotal ? Math.max(0, estimatedTotal - plannedTotal) : 0,
  };
}
