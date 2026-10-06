import "server-only";
import { z } from "zod";
import type { TripDetail } from "@/lib/dto";
import type { AccommodationOffer, FlightOffer } from "@/lib/types";
import { computeBudget } from "@/lib/budget";
import { haversineKm } from "@/lib/geo";
import { bestActivityMove } from "@/lib/itinerary/optimize";
import { formatKm, formatPrice } from "@/lib/format";
import { addDays, formatDate, formatDuration } from "@/lib/time";
import { accommodations } from "@/server/providers";
import { searchAccommodations, searchFlights } from "./search";
import { generateItineraryForTrip, reorderItinerary } from "./itinerary";
import { getTripDetail, setAccommodation, setFlight, updateTrip } from "./trips";
import { AppError } from "./errors";

export const suggestionActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("replace_flight"), direction: z.enum(["andata", "ritorno"]), offerId: z.string().max(200) }),
  z.object({
    type: z.literal("shift_dates"),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    outboundOfferId: z.string().max(200),
    returnOfferId: z.string().max(200),
    stayOfferId: z.string().max(200).optional(),
  }),
  z.object({ type: z.literal("replace_stay"), offerId: z.string().max(200) }),
  z.object({ type: z.literal("move_activity"), activityId: z.string(), toDayId: z.string(), index: z.number().int().min(0) }),
]);
export type SuggestionAction = z.infer<typeof suggestionActionSchema>;

export interface Suggestion {
  id: string;
  kind: "volo" | "date" | "alloggio" | "itinerario" | "budget";
  title: string;
  description: string;
  /** Risparmio per il gruppo in euro */
  savings?: number;
  timeSavedMin?: number;
  action?: SuggestionAction;
}

const MIN_SAVING_PER_PERSON = 10;

function betterFlight(current: TripDetail["flights"][number], offers: FlightOffer[]): FlightOffer | null {
  const candidates = offers.filter(
    (o) => o.id !== current.offerId && o.stops <= current.stops && o.durationMin <= current.durationMin + 90 && current.pricePerPerson - o.price >= MIN_SAVING_PER_PERSON,
  );
  return candidates.sort((a, b) => a.price - b.price)[0] ?? null;
}

function cheapestReasonable(offers: FlightOffer[], maxStops: number): FlightOffer | null {
  return offers.filter((o) => o.stops <= maxStops).sort((a, b) => a.price - b.price)[0] ?? null;
}

function similarStay(current: NonNullable<TripDetail["stay"]>, offers: AccommodationOffer[]): AccommodationOffer | null {
  return (
    offers
      .filter((o) => o.type === current.type && o.rating >= current.rating - 0.5)
      .sort((a, b) => haversineKm(a.location, current.location) - haversineKm(b.location, current.location))[0] ?? null
  );
}

async function flightSuggestions(trip: TripDetail): Promise<Suggestion[]> {
  const out: Suggestion[] = [];
  await Promise.all(
    trip.flights.map(async (f) => {
      const offers = await searchFlights(f.fromCode, f.toCode, f.departAt.slice(0, 10), trip.travelersCount);
      const better = betterFlight(f, offers);
      if (!better) return;
      const savings = (f.pricePerPerson - better.price) * trip.travelersCount;
      out.push({
        id: `flight-${f.direction}-${better.id}`,
        kind: "volo",
        title: `Abbiamo trovato un volo di ${f.direction} più economico`,
        description: `${better.airline} alle ${better.departAt.slice(11, 16)}, ${better.stops ? "1 scalo" : "diretto"}: ${formatPrice(better.price)} a persona invece di ${formatPrice(f.pricePerPerson)}.`,
        savings,
        action: { type: "replace_flight", direction: f.direction, offerId: better.id },
      });
    }),
  );
  return out;
}

async function dateSuggestions(trip: TripDetail): Promise<Suggestion[]> {
  const out = trip.flights.find((f) => f.direction === "andata");
  const back = trip.flights.find((f) => f.direction === "ritorno");
  if (!out || !back) return [];
  const currentFlights = out.pricePerPerson + back.pricePerPerson;
  const currentStay = trip.stay?.priceTotal ?? 0;
  const maxStops = Math.max(out.stops, back.stops);

  const options = await Promise.all(
    [-1, 1].map(async (shift) => {
      const startDate = addDays(trip.startDate, shift);
      const endDate = addDays(trip.endDate, shift);
      if (startDate <= new Date().toISOString().slice(0, 10)) return null;
      const [outs, backs, stays] = await Promise.all([
        searchFlights(out.fromCode, out.toCode, startDate, trip.travelersCount),
        searchFlights(back.fromCode, back.toCode, endDate, trip.travelersCount),
        trip.stay ? searchAccommodations(trip.destinationId, startDate, endDate, trip.travelersCount) : Promise.resolve([]),
      ]);
      const o = cheapestReasonable(outs, maxStops);
      const b = cheapestReasonable(backs, maxStops);
      if (!o || !b) return null;
      const stay = trip.stay ? similarStay(trip.stay, stays) : null;
      if (trip.stay && !stay) return null;
      const newTotal = (o.price + b.price) * trip.travelersCount + (stay?.priceTotal ?? 0);
      const currentTotal = currentFlights * trip.travelersCount + currentStay;
      return { shift, startDate, endDate, o, b, stay, savings: currentTotal - newTotal };
    }),
  );
  const best = options.filter((x) => x && x.savings >= MIN_SAVING_PER_PERSON * 2 * trip.travelersCount).sort((a, b) => b!.savings - a!.savings)[0];
  if (!best) return [];
  return [
    {
      id: `dates-${best.startDate}`,
      kind: "date",
      title: `Partendo un giorno ${best.shift < 0 ? "prima" : "dopo"} puoi risparmiare ${formatPrice(best.savings)}`,
      description: `Dal ${formatDate(best.startDate)} al ${formatDate(best.endDate)}, stessa durata${best.stay ? " e un alloggio simile nella stessa zona" : ""}. Voli: ${best.o.airline} e ${best.b.airline}.`,
      savings: best.savings,
      action: { type: "shift_dates", startDate: best.startDate, endDate: best.endDate, outboundOfferId: best.o.id, returnOfferId: best.b.id, stayOfferId: best.stay?.id },
    },
  ];
}

async function staySuggestions(trip: TripDetail): Promise<Suggestion[]> {
  const stay = trip.stay;
  if (!stay) return [];
  const offers = await searchAccommodations(trip.destinationId, stay.checkIn, stay.checkOut, trip.travelersCount);
  const candidates = offers
    .filter((o) => o.id !== stay.offerId && o.rating >= stay.rating - 0.3 && stay.priceTotal - o.priceTotal >= 40)
    .map((o) => ({ o, km: haversineKm(o.location, stay.location) }))
    .filter((x) => x.km <= 1.2)
    .sort((a, b) => a.o.priceTotal - b.o.priceTotal || a.km - b.km);
  const pick = candidates[0];
  if (!pick) return [];
  const savings = stay.priceTotal - pick.o.priceTotal;
  return [
    {
      id: `stay-${pick.o.id}`,
      kind: "alloggio",
      title: `Questa struttura costa ${formatPrice(savings)} in meno e si trova a ${formatKm(pick.km)} dalla tua scelta`,
      description: `${pick.o.name} · voto ${pick.o.rating.toFixed(1)} (${pick.o.reviewsCount} recensioni)${pick.o.freeCancellation ? " · cancellazione gratuita" : ""}.`,
      savings,
      action: { type: "replace_stay", offerId: pick.o.id },
    },
  ];
}

/** Cerca l'attività che, spostata in un altro giorno, riduce di più gli spostamenti totali. */
export function itinerarySuggestions(trip: Pick<TripDetail, "itinerary">): Suggestion[] {
  const b = bestActivityMove(trip.itinerary?.days ?? []);
  if (!b) return [];
  return [
    {
      id: `move-${b.activityId}-${b.toDayId}`,
      kind: "itinerario",
      title: `Spostando "${b.title}" al giorno ${b.toIdx + 1} riduci gli spostamenti di ${formatDuration(Math.round(b.saving))}`,
      description: `È più vicina alle altre tappe del giorno ${b.toIdx + 1}. Gli orari vengono ricalcolati in automatico.`,
      timeSavedMin: Math.round(b.saving),
      action: { type: "move_activity", activityId: b.activityId, toDayId: b.toDayId, index: b.index },
    },
  ];
}

function budgetSuggestions(trip: TripDetail, others: Suggestion[]): Suggestion[] {
  const budget = computeBudget(trip);
  if (!budget.plannedTotal || budget.overBy <= 0) return [];
  const recoverable = others.reduce((s, x) => s + (x.savings ?? 0), 0);
  return [
    {
      id: "budget-over",
      kind: "budget",
      title: `Sei sopra il budget di ${formatPrice(budget.overBy)}`,
      description: recoverable
        ? `Applicando i suggerimenti qui sotto recuperi fino a ${formatPrice(recoverable)}.`
        : "Prova un alloggio più economico, un volo con orari meno comodi o attività gratuite.",
    },
  ];
}

/**
 * `free`: solo ciò che si calcola in locale (itinerario, budget): nessuna ricerca a pagamento.
 * `all`: in più confronta voli, date e alloggi con ricerche nuove; con un provider a pagamento
 * consuma fino a ~9 ricerche, per questo parte solo su richiesta esplicita dell'utente.
 */
export async function getSuggestions(userId: string, tripId: string, scope: "free" | "all" = "all"): Promise<Suggestion[]> {
  const trip = await getTripDetail(userId, tripId);
  const local = itinerarySuggestions(trip);
  if (scope === "free") return [...budgetSuggestions(trip, local), ...local];

  const settled = await Promise.allSettled([flightSuggestions(trip), dateSuggestions(trip), staySuggestions(trip)]);
  const priced = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  // Se tutte le ricerche sono fallite (quota, chiave, servizio) lo diciamo, invece di far credere che non ci sia nulla da risparmiare
  const failures = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length === settled.length) throw failures[0].reason;
  // Non proporre insieme "volo più economico" e "cambia date": si sovrappongono
  const dates = priced.find((s) => s.kind === "date");
  const filtered = dates ? priced.filter((s) => s.kind !== "volo" || (s.savings ?? 0) > (dates.savings ?? 0)) : priced;
  const all = [...filtered.sort((a, b) => (b.savings ?? 0) - (a.savings ?? 0)), ...local];
  return [...budgetSuggestions(trip, all), ...all];
}

export async function applySuggestion(userId: string, tripId: string, raw: unknown): Promise<void> {
  const action = suggestionActionSchema.parse(raw);
  switch (action.type) {
    case "replace_flight":
      return setFlight(userId, tripId, action.offerId, action.direction);
    case "replace_stay":
      return setAccommodation(userId, tripId, action.offerId);
    case "move_activity": {
      const trip = await getTripDetail(userId, tripId);
      const days = trip.itinerary?.days ?? [];
      const from = days.find((d) => d.activities.some((a) => a.id === action.activityId));
      const to = days.find((d) => d.id === action.toDayId);
      if (!from || !to) throw new AppError("conflict", "L'itinerario è cambiato: aggiorna i suggerimenti");
      const toIds = to.activities.map((a) => a.id);
      toIds.splice(Math.min(action.index, toIds.length), 0, action.activityId);
      await reorderItinerary(userId, tripId, {
        days: [
          { dayId: from.id, activityIds: from.activities.map((a) => a.id).filter((id) => id !== action.activityId) },
          { dayId: to.id, activityIds: toIds },
        ],
      });
      return;
    }
    case "shift_dates": {
      const trip = await getTripDetail(userId, tripId);
      const offer = action.stayOfferId ? await accommodations.getOffer(action.stayOfferId) : null;
      if (action.stayOfferId && !offer) throw new AppError("conflict", "L'alloggio proposto non è più disponibile");
      await updateTrip(userId, tripId, {
        name: trip.name, destinationId: trip.destinationId, originCode: trip.originCode ?? undefined, startDate: action.startDate,
        endDate: action.endDate, travelersCount: trip.travelersCount, budgetPerPerson: trip.budgetPerPerson ?? undefined, pace: trip.pace,
      });
      await Promise.all([
        setFlight(userId, tripId, action.outboundOfferId, "andata"),
        setFlight(userId, tripId, action.returnOfferId, "ritorno"),
        action.stayOfferId ? setAccommodation(userId, tripId, action.stayOfferId) : null,
      ]);
      // Orari dei voli cambiati: rigenera le giornate non toccate dall'utente
      if (trip.itinerary) await generateItineraryForTrip(userId, tripId);
      return;
    }
  }
}
