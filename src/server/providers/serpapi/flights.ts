import "server-only";
import type { Airport, BookingOption, BookingRef, FlightOffer } from "@/lib/types";
import { hashString } from "@/lib/random";
import { cacheGet, cacheSet } from "@/server/cache/db-cache";
import { findAirport, ORIGIN_AIRPORTS } from "@/server/mock-data/airports";
import { ProviderError } from "../errors";
import type { FlightProvider, FlightSearchQuery, RoundTripQuote, RoundTripQuoteQuery } from "../types";
import { isEmptyResult, ttlFromEnv, type SerpApiClient } from "./client";
import { cheapestPrice, parseBookingOptions, parseFlightResults } from "./parse-flights";

export const OFFER_TTL_MS = 48 * 60 * 60_000;

const COMMON = { currency: "EUR", hl: "it", gl: "it" } as const;

/**
 * Voli reali da Google Flights tramite SerpApi.
 * Le tratte si cercano come sola andata (due ricerche per un A/R) con 1 adulto: il prezzo è così sempre
 * "per persona" e la stessa ricerca vale per qualsiasi numero di viaggiatori (meno quota consumata).
 */
export class SerpApiFlightProvider implements FlightProvider {
  readonly name = "serpapi";
  readonly isMock = false;
  readonly metered = true;

  constructor(private client: SerpApiClient) {}

  async search(query: FlightSearchQuery): Promise<FlightOffer[]> {
    const from = findAirport(query.from);
    const to = findAirport(query.to);
    if (!from || !to) throw new ProviderError("invalid_input", "Aeroporto non riconosciuto");
    if (from.code === to.code) throw new ProviderError("invalid_input", "Partenza e destinazione coincidono");

    const res = await this.client.search({
      params: { engine: "google_flights", type: 2, departure_id: from.code, arrival_id: to.code, outbound_date: query.date, adults: 1, ...COMMON },
      cacheKey: `serpapi:fl:ow:${from.code}:${to.code}:${query.date}`,
      ttlMs: ttlFromEnv("SERPAPI_CACHE_FLIGHTS_MINUTES", 180),
      klass: "interactive",
    });
    if (!res || isEmptyResult(res.json)) return [];

    const offers = parseFlightResults(res.json, { from: from.code, to: to.code, fromCity: from.city, toCity: to.city, date: query.date, fetchedAt: res.fetchedAt });
    // Le offerte restano rileggibili (per id) mentre l'utente accede e salva il viaggio
    await Promise.all(offers.map((o) => cacheSet(`offer:${o.id}`, o, OFFER_TTL_MS)));
    return offers;
  }

  async getOffer(offerId: string): Promise<FlightOffer | null> {
    return (await cacheGet<FlightOffer>(`offer:${offerId}`))?.value ?? null;
  }

  async quoteRoundTrip(q: RoundTripQuoteQuery, opts: { cacheOnly: boolean }): Promise<RoundTripQuote> {
    if (!findAirport(q.from) || !findAirport(q.to)) return { status: "none" };
    const res = await this.client.search({
      params: { engine: "google_flights", type: 1, departure_id: q.from, arrival_id: q.to, outbound_date: q.depart, return_date: q.ret, adults: 1, ...COMMON },
      cacheKey: `serpapi:fl:rt:${q.from}:${q.to}:${q.depart}:${q.ret}`,
      ttlMs: ttlFromEnv("SERPAPI_CACHE_INDICATIVE_MINUTES", 24 * 60),
      klass: "indicative",
      cacheOnly: opts.cacheOnly,
    });
    if (!res) return { status: "miss" };
    if (isEmptyResult(res.json)) return { status: "none" };
    // Con andata e ritorno richiesti, `price` è il prezzo dell'intero A/R per persona
    const price = cheapestPrice(res.json);
    return price == null ? { status: "none" } : { status: "hit", price, fetchedAt: res.fetchedAt };
  }

  async getBookingOptions(ref: BookingRef): Promise<BookingOption[]> {
    const { booking_token, departure_id, arrival_id, outbound_date } = ref.params;
    if (ref.kind !== "flight" || !booking_token || !departure_id || !arrival_id || !outbound_date) {
      throw new ProviderError("invalid_input", "Riferimento di prenotazione non valido");
    }
    const res = await this.client.search({
      params: { engine: "google_flights", type: 2, departure_id, arrival_id, outbound_date, booking_token, adults: 1, ...COMMON },
      cacheKey: `serpapi:fl:book:${hashString(booking_token).toString(36)}:${booking_token.length}`,
      ttlMs: ttlFromEnv("SERPAPI_CACHE_BOOKING_MINUTES", 60),
      klass: "interactive",
    });
    if (!res) return [];
    return parseBookingOptions(res.json);
  }

  async getAirport(code: string): Promise<Airport | null> {
    return findAirport(code) ?? null;
  }

  async listOriginAirports(): Promise<Airport[]> {
    return ORIGIN_AIRPORTS;
  }
}
