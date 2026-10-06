import "server-only";
import type { AccommodationOffer, FlightOffer } from "@/lib/types";
import { accommodations, flights } from "@/server/providers";
import { withTimeout } from "@/server/providers/errors";
import { cached } from "./cache";

// Cache in memoria di breve durata davanti a quella persistente del provider: evita anche le letture su DB
const PRICE_TTL = 5 * 60_000;
// I provider a pagamento (Google via SerpApi) possono impiegare diversi secondi
const TIMEOUT_MS = 30_000;

export function searchFlights(from: string, to: string, date: string, travelers: number): Promise<FlightOffer[]> {
  return cached(`fl:${from}:${to}:${date}:${travelers}`, PRICE_TTL, () => withTimeout(flights.search({ from, to, date, travelers }), TIMEOUT_MS));
}

export function searchAccommodations(destinationId: string, checkIn: string, checkOut: string, guests: number): Promise<AccommodationOffer[]> {
  return cached(`acc:${destinationId}:${checkIn}:${checkOut}:${guests}`, PRICE_TTL, () =>
    withTimeout(accommodations.search({ destinationId, checkIn, checkOut, guests }), TIMEOUT_MS),
  );
}

/**
 * Prima di mandare le offerte al browser togliamo i parametri interni di prenotazione (token del provider):
 * al client basta sapere SE l'offerta è prenotabile. I link veri si ottengono dal server tramite l'id.
 */
export function forClient<T extends { bookingRef?: { provider: string; kind: "flight" | "stay"; params: Record<string, string> } }>(offers: T[]): T[] {
  return offers.map((o) => (o.bookingRef ? { ...o, bookingRef: { ...o.bookingRef, params: {} } } : o));
}
