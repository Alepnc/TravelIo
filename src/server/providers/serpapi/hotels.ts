import "server-only";
import type { AccommodationOffer, BookingOption, BookingRef } from "@/lib/types";
import { hashString } from "@/lib/random";
import { diffDays } from "@/lib/time";
import { cacheGet, cacheSet } from "@/server/cache/db-cache";
import { DESTINATIONS } from "@/server/mock-data/destinations";
import { ProviderError } from "../errors";
import type { AccommodationProvider, AccommodationSearchQuery } from "../types";
import { isEmptyResult, ttlFromEnv, type SerpApiClient } from "./client";
import { OFFER_TTL_MS } from "./flights";
import { parseHotelResults, parseHotelSellers } from "./parse-hotels";
import { toBookingOption } from "./parse-flights";

const COMMON = { currency: "EUR", hl: "it", gl: "it" } as const;

/**
 * Alloggi reali da Google Hotels tramite SerpApi.
 * Il prezzo è quello che Google indica per la ricerca (date e numero di ospiti): se un alloggio richiede più
 * camere, il totale può differire; il venditore mostra il prezzo definitivo.
 */
export class SerpApiAccommodationProvider implements AccommodationProvider {
  readonly name = "serpapi";
  readonly isMock = false;
  readonly metered = true;

  constructor(private client: SerpApiClient) {}

  async search(query: AccommodationSearchQuery): Promise<AccommodationOffer[]> {
    const dest = DESTINATIONS.find((d) => d.id === query.destinationId);
    if (!dest) throw new ProviderError("not_found", "Destinazione non trovata");
    if (diffDays(query.checkIn, query.checkOut) <= 0) throw new ProviderError("invalid_input", "La data di check-out deve essere successiva al check-in");

    const q = `hotel ${dest.name} ${dest.country}`;
    const rentals = process.env.SERPAPI_INCLUDE_RENTALS === "true";
    const res = await this.client.search({
      params: { engine: "google_hotels", q, check_in_date: query.checkIn, check_out_date: query.checkOut, adults: query.guests, vacation_rentals: rentals ? true : undefined, ...COMMON },
      cacheKey: `serpapi:ho:${dest.id}:${query.checkIn}:${query.checkOut}:${query.guests}:${rentals ? "r" : "h"}`,
      ttlMs: ttlFromEnv("SERPAPI_CACHE_HOTELS_MINUTES", 360),
      klass: "interactive",
    });
    if (!res || isEmptyResult(res.json)) return [];

    const offers = parseHotelResults(res.json, { destinationId: dest.id, query: q, center: dest.location, checkIn: query.checkIn, checkOut: query.checkOut, guests: query.guests, fetchedAt: res.fetchedAt });
    await Promise.all(offers.map((o) => cacheSet(`offer:${o.id}`, o, OFFER_TTL_MS)));
    return offers;
  }

  async getOffer(offerId: string): Promise<AccommodationOffer | null> {
    return (await cacheGet<AccommodationOffer>(`offer:${offerId}`))?.value ?? null;
  }

  async getBookingOptions(ref: BookingRef): Promise<BookingOption[]> {
    const { property_token, q, check_in_date, check_out_date, adults, link } = ref.params;
    if (ref.kind !== "stay") throw new ProviderError("invalid_input", "Riferimento di prenotazione non valido");
    if (!property_token || !q || !check_in_date || !check_out_date) {
      const only = link ? toBookingOption("Google Hotels", null, "Confronta i prezzi dei venditori su Google", { url: link }) : null;
      return only ? [only] : [];
    }
    const res = await this.client.search({
      params: { engine: "google_hotels", q, check_in_date, check_out_date, adults: Number(adults) || 2, property_token, ...COMMON },
      cacheKey: `serpapi:ho:book:${hashString(`${property_token}|${check_in_date}|${check_out_date}|${adults}`).toString(36)}`,
      ttlMs: ttlFromEnv("SERPAPI_CACHE_BOOKING_MINUTES", 60),
      klass: "interactive",
    });
    if (!res) return [];
    return parseHotelSellers(res.json, ref, diffDays(check_in_date, check_out_date));
  }
}
