/** Filtri e ordinamenti dei risultati: funzioni pure, eseguite sul client per un feedback istantaneo. */
import type { AccommodationOffer, AccommodationType, FlightOffer } from "./types";
import { toMinutes } from "./time";

export type FlightSort = "valore" | "prezzo" | "durata" | "orario";
export type TimeSlot = "mattina" | "pomeriggio" | "sera";

export interface FlightFilters {
  maxPrice: number | null;
  maxDurationMin: number | null;
  maxStops: number | null;
  slots: TimeSlot[];
  airlines: string[];
  avoidStopAirports: string[];
  cabinBag: boolean;
  checkedBag: boolean;
}

export const EMPTY_FLIGHT_FILTERS: FlightFilters = { maxPrice: null, maxDurationMin: null, maxStops: null, slots: [], airlines: [], avoidStopAirports: [], cabinBag: false, checkedBag: false };

export function slotOf(isoDateTime: string): TimeSlot {
  const m = toMinutes(isoDateTime.slice(11, 16));
  return m < 12 * 60 ? "mattina" : m < 18 * 60 ? "pomeriggio" : "sera";
}

/** Punteggio "miglior rapporto qualità/prezzo": prezzo + ~15 €/ora di viaggio + penalità scali − valore bagagli. */
export function flightValue(f: FlightOffer): number {
  return f.price + f.durationMin * 0.25 + f.stops * 25 - (f.baggage.checked ? 20 : 0) - (f.baggage.cabin ? 10 : 0);
}

export function filterFlights(list: FlightOffer[], f: FlightFilters): FlightOffer[] {
  return list.filter(
    (o) =>
      (f.maxPrice == null || o.price <= f.maxPrice) &&
      (f.maxDurationMin == null || o.durationMin <= f.maxDurationMin) &&
      (f.maxStops == null || o.stops <= f.maxStops) &&
      (!f.slots.length || f.slots.includes(slotOf(o.departAt))) &&
      (!f.airlines.length || f.airlines.includes(o.airline)) &&
      !o.stopCodes.some((c) => f.avoidStopAirports.includes(c)) &&
      (!f.cabinBag || o.baggage.cabin === true) &&
      (!f.checkedBag || o.baggage.checked === true),
  );
}

export function sortFlights(list: FlightOffer[], sort: FlightSort): FlightOffer[] {
  const key: Record<FlightSort, (o: FlightOffer) => number | string> = {
    valore: flightValue,
    prezzo: (o) => o.price,
    durata: (o) => o.durationMin,
    orario: (o) => o.departAt,
  };
  return [...list].sort((a, b) => (key[sort](a) < key[sort](b) ? -1 : key[sort](a) > key[sort](b) ? 1 : a.price - b.price));
}

/** Etichette "Più economico", "Più veloce", "Consigliato" */
export function flightBadges(list: FlightOffer[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!list.length) return out;
  const add = (o: FlightOffer, b: string) => out.set(o.id, [...(out.get(o.id) ?? []), b]);
  add(list.reduce((a, b) => (b.price < a.price ? b : a)), "Più economico");
  add(list.reduce((a, b) => (b.durationMin < a.durationMin ? b : a)), "Più veloce");
  add(list.reduce((a, b) => (flightValue(b) < flightValue(a) ? b : a)), "Consigliato");
  return out;
}

export type StaySort = "valore" | "prezzo" | "voto" | "distanza";

export interface StayFilters {
  maxPricePerNight: number | null;
  minRating: number | null;
  maxDistanceKm: number | null;
  types: AccommodationType[];
  amenities: string[];
  freeCancellation: boolean;
}

export const EMPTY_STAY_FILTERS: StayFilters = { maxPricePerNight: null, minRating: null, maxDistanceKm: null, types: [], amenities: [], freeCancellation: false };

export function stayValue(s: AccommodationOffer): number {
  return s.pricePerNight / Math.pow(Math.max(s.rating, 5) / 8, 2) + s.distanceFromCenterKm * 6;
}

export function filterStays(list: AccommodationOffer[], f: StayFilters): AccommodationOffer[] {
  return list.filter(
    (s) =>
      (f.maxPricePerNight == null || s.pricePerNight <= f.maxPricePerNight) &&
      (f.minRating == null || s.rating >= f.minRating) &&
      (f.maxDistanceKm == null || s.distanceFromCenterKm <= f.maxDistanceKm) &&
      (!f.types.length || f.types.includes(s.type)) &&
      f.amenities.every((a) => s.amenities.includes(a)) &&
      (!f.freeCancellation || s.freeCancellation),
  );
}

export function sortStays(list: AccommodationOffer[], sort: StaySort): AccommodationOffer[] {
  const key: Record<StaySort, (s: AccommodationOffer) => number> = {
    valore: stayValue,
    prezzo: (s) => s.pricePerNight,
    voto: (s) => -s.rating,
    distanza: (s) => s.distanceFromCenterKm,
  };
  return [...list].sort((a, b) => key[sort](a) - key[sort](b));
}

export function countActive(f: object): number {
  return Object.values(f).filter((v) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== false)).length;
}
