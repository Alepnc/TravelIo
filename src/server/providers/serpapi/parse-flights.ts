/**
 * Conversione delle risposte SerpApi "google_flights" nel nostro modello.
 *
 * Il formato è quello documentato da SerpApi (best_flights / other_flights con segmenti in `flights`,
 * `layovers`, `price`, `booking_token`; `booking_options[].together.booking_request` per i venditori).
 * Tutto è validato in modo permissivo: un elemento che non rispetta la forma attesa viene scartato,
 * e se TUTTI gli elementi sono scartati si segnala un errore esplicito invece di mostrare una lista vuota.
 */
import { z } from "zod";
import type { BookingOption, BookingRef, FlightOffer } from "@/lib/types";
import { hashString } from "@/lib/random";
import { ProviderError } from "../errors";

const airportSchema = z.object({ name: z.string().optional(), id: z.string().min(2), time: z.string().min(10) }).passthrough();

const segmentSchema = z
  .object({
    departure_airport: airportSchema,
    arrival_airport: airportSchema,
    duration: z.number().optional(),
    airline: z.string().optional(),
    flight_number: z.string().optional(),
  })
  .passthrough();

const itinerarySchema = z
  .object({
    flights: z.array(segmentSchema).min(1),
    layovers: z.array(z.object({ id: z.string().optional(), name: z.string().optional(), duration: z.number().optional() }).passthrough()).optional(),
    total_duration: z.number().optional(),
    price: z.number().optional(),
    booking_token: z.string().optional(),
    extensions: z.array(z.string()).optional(),
  })
  .passthrough();

export interface FlightParseContext {
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  date: string;
  fetchedAt: string;
}

/** "2027-05-13 12:35" → "2027-05-13T12:35" */
function toLocalIso(time: string): string | null {
  const m = time.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : null;
}

function airlineCodeOf(flightNumber: string | undefined): string {
  const m = flightNumber?.trim().match(/^([A-Z0-9]{2})\s?\d/);
  return m ? m[1] : "";
}

export function itineraryList(json: Record<string, unknown>): unknown[] {
  const list = (key: string) => (Array.isArray(json[key]) ? (json[key] as unknown[]) : []);
  return [...list("best_flights"), ...list("other_flights")];
}

export function parseFlightResults(json: Record<string, unknown>, ctx: FlightParseContext, limit = 30): FlightOffer[] {
  const raw = itineraryList(json);
  const offers = new Map<string, FlightOffer>();
  let skipped = 0;

  for (const item of raw) {
    const parsed = itinerarySchema.safeParse(item);
    if (!parsed.success || parsed.data.price == null || parsed.data.price <= 0) {
      skipped++;
      continue;
    }
    const it = parsed.data;
    const first = it.flights[0];
    const last = it.flights[it.flights.length - 1];
    const departAt = toLocalIso(first.departure_airport.time);
    const arriveAt = toLocalIso(last.arrival_airport.time);
    if (!departAt || !arriveAt) {
      skipped++;
      continue;
    }

    const airlines = [...new Set(it.flights.map((s) => s.airline).filter((a): a is string => !!a))];
    const stopCodes = (it.layovers ?? []).map((l) => l.id).filter((x): x is string => !!x);
    const durationMin = it.total_duration ?? it.flights.reduce((s, f) => s + (f.duration ?? 0), 0) + (it.layovers ?? []).reduce((s, l) => s + (l.duration ?? 0), 0);

    // Identità stabile: stesse tratte e orari → stesso id (utile alla cache delle offerte e alla deduplica)
    const signature = it.flights.map((s) => `${s.flight_number ?? s.airline}@${s.departure_airport.time}`).join("|");
    const id = `serp-fl~${ctx.from}~${ctx.to}~${ctx.date}~${hashString(signature).toString(36)}`;

    const ref: BookingRef | undefined = it.booking_token
      ? { provider: "serpapi", kind: "flight", params: { booking_token: it.booking_token, departure_id: ctx.from, arrival_id: ctx.to, outbound_date: ctx.date } }
      : undefined;

    offers.set(id, {
      id,
      provider: "serpapi",
      airline: airlines.join(" + ") || "Compagnia non indicata",
      airlineCode: airlineCodeOf(first.flight_number),
      flightNumber: it.flights.map((s) => s.flight_number).filter(Boolean).join(" · ") || "",
      fromCode: first.departure_airport.id,
      toCode: last.arrival_airport.id,
      fromCity: ctx.fromCity,
      toCity: ctx.toCity,
      departAt,
      arriveAt,
      durationMin: Math.max(1, Math.round(durationMin)),
      stops: it.flights.length - 1,
      stopCodes,
      price: Math.round(it.price!),
      // I risultati di ricerca non indicano in modo affidabile i bagagli: si vedono sul sito del venditore
      baggage: { cabin: null, checked: null },
      conditions: [
        "Bagagli e tariffa: verifica sul sito del venditore prima di pagare",
        ...(airlines.length > 1 ? ["Itinerario con più compagnie: biglietti e bagagli possono essere separati"] : []),
      ],
      refundable: false,
      fetchedAt: ctx.fetchedAt,
      bookingRef: ref,
    });
    if (offers.size >= limit) break;
  }

  if (raw.length > 0 && offers.size === 0) {
    // Nessun elemento valido pur avendo ricevuto risultati: formato cambiato o dati incompleti
    console.error(`[serpapi] ${raw.length} voli ricevuti ma nessuno interpretabile (${skipped} scartati)`);
    throw new ProviderError("unavailable", "Il servizio prezzi ha restituito dati in un formato inatteso.");
  }
  return [...offers.values()];
}

/** Prezzo più basso tra i risultati (usato per le ricerche A/R indicative). */
export function cheapestPrice(json: Record<string, unknown>): number | null {
  let best: number | null = null;
  for (const item of itineraryList(json)) {
    const price = (item as { price?: unknown })?.price;
    if (typeof price === "number" && price > 0 && (best == null || price < best)) best = price;
  }
  return best == null ? null : Math.round(best);
}

// ───────── Opzioni di prenotazione ─────────

const bookingRequestSchema = z.object({ url: z.string(), post_data: z.string().optional() }).passthrough();

const bookingOptionSchema = z
  .object({
    book_with: z.string().optional(),
    price: z.number().optional(),
    option_title: z.string().optional(),
    marketed_as: z.array(z.string()).optional(),
    booking_request: bookingRequestSchema.optional(),
  })
  .passthrough();

/** Solo link https verso un host reale: i link vengono dal provider e finiscono in un href. */
export function isSafeBookingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export function toBookingOption(seller: string, price: number | null, note: string | undefined, req: { url: string; post_data?: string }): BookingOption | null {
  if (!isSafeBookingUrl(req.url)) return null;
  if (req.post_data) {
    // post_data è una stringa urlencoded: la trasformiamo in campi di un form
    const fields = Object.fromEntries(new URLSearchParams(req.post_data));
    return { seller, price, note, url: req.url, method: "POST", fields };
  }
  return { seller, price, note, url: req.url, method: "GET" };
}

export function parseBookingOptions(json: Record<string, unknown>): BookingOption[] {
  const raw = Array.isArray(json.booking_options) ? (json.booking_options as unknown[]) : [];
  const out: BookingOption[] = [];
  for (const entry of raw) {
    // `together` = biglietto unico; `departing`/`returning` = biglietti separati, non gestiti per le tratte singole
    const together = (entry as { together?: unknown })?.together;
    const parsed = bookingOptionSchema.safeParse(together);
    if (!parsed.success || !parsed.data.booking_request) continue;
    const o = parsed.data;
    const option = toBookingOption(o.book_with ?? "Venditore", o.price != null ? Math.round(o.price) : null, o.option_title ?? o.marketed_as?.join(", "), o.booking_request!);
    if (option) out.push(option);
  }
  return out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
}
