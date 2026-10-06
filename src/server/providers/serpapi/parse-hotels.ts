/**
 * Conversione delle risposte SerpApi "google_hotels" nel nostro modello.
 * Come per i voli: validazione permissiva, scarto delle strutture non utilizzabili
 * (senza prezzo preciso o senza coordinate) ed errore esplicito se non resta nulla.
 */
import { z } from "zod";
import type { AccommodationOffer, AccommodationType, BookingOption, BookingRef, LatLng } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { diffDays } from "@/lib/time";
import { hashString } from "@/lib/random";
import { ProviderError } from "../errors";
import { toBookingOption } from "./parse-flights";

const priceSchema = z.object({ extracted_lowest: z.number().optional(), lowest: z.string().optional() }).passthrough();

const propertySchema = z
  .object({
    type: z.string().optional(),
    name: z.string().min(1),
    link: z.string().optional(),
    property_token: z.string().optional(),
    gps_coordinates: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
    rate_per_night: priceSchema.optional(),
    total_rate: priceSchema.optional(),
    overall_rating: z.number().optional(),
    reviews: z.number().optional(),
    amenities: z.array(z.string()).optional(),
    free_cancellation: z.boolean().optional(),
    images: z.array(z.object({ thumbnail: z.string().optional(), original_image: z.string().optional() }).passthrough()).optional(),
    essential_info: z.array(z.string()).optional(),
  })
  .passthrough();

export interface HotelParseContext {
  destinationId: string;
  query: string;
  center: LatLng;
  checkIn: string;
  checkOut: string;
  guests: number;
  fetchedAt: string;
}

/** Servizi in italiano/inglese → etichette canoniche usate dai filtri. Le altre voci restano com'erano. */
const AMENITY_MAP: [RegExp, string][] = [
  [/wi-?fi/i, "Wi-Fi"],
  [/cucina|kitchen/i, "Cucina"],
  [/colazione|breakfast/i, "Colazione"],
  [/condizionat|air.?condition/i, "Aria condizionata"],
  [/piscina|pool/i, "Piscina"],
  [/lavatrice|lavanderia|washer|laundry|washing/i, "Lavatrice"],
  [/parcheggio|parking/i, "Parcheggio"],
  [/palestra|fitness|gym/i, "Palestra"],
  [/spa\b/i, "Spa"],
];

export function normalizeAmenities(list: string[] | undefined): string[] {
  const out = new Set<string>();
  for (const raw of list ?? []) {
    const hit = AMENITY_MAP.find(([re]) => re.test(raw));
    out.add(hit ? hit[1] : raw.trim());
  }
  return [...out].slice(0, 12);
}

export function stayTypeOf(p: { type?: string; name: string }): AccommodationType {
  const t = `${p.type ?? ""} ${p.name}`.toLowerCase();
  if (/vacation rental|affitto|apartment|appartament|flat|loft|studio\b/.test(t)) return "appartamento";
  if (/hostel|ostello/.test(t)) return "ostello";
  if (/b&b|bed and breakfast|bed & breakfast|guest ?house|pensione|affittacamere/.test(t)) return "bnb";
  if (/resort/.test(t)) return "resort";
  return "hotel";
}

export function parseHotelResults(json: Record<string, unknown>, ctx: HotelParseContext, limit = 30): AccommodationOffer[] {
  const nights = diffDays(ctx.checkIn, ctx.checkOut);
  const raw = [...(Array.isArray(json.properties) ? (json.properties as unknown[]) : []), ...(Array.isArray(json.vacation_rentals) ? (json.vacation_rentals as unknown[]) : [])];
  const out = new Map<string, AccommodationOffer>();
  let skipped = 0;

  for (const item of raw) {
    const parsed = propertySchema.safeParse(item);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const p = parsed.data;
    const perNight = p.rate_per_night?.extracted_lowest;
    const total = p.total_rate?.extracted_lowest;
    // Senza prezzo preciso o senza posizione non possiamo né confrontare né mostrare in mappa
    if ((!perNight && !total) || !p.gps_coordinates || nights <= 0) {
      skipped++;
      continue;
    }
    const priceTotal = Math.round(total ?? perNight! * nights);
    const pricePerNight = Math.round(perNight ?? priceTotal / nights);
    const location = { lat: p.gps_coordinates.latitude, lng: p.gps_coordinates.longitude };
    const amenities = normalizeAmenities(p.amenities);
    const id = `serp-acc~${ctx.destinationId}~${ctx.checkIn}~${ctx.checkOut}~${hashString(p.property_token ?? `${p.name}@${location.lat},${location.lng}`).toString(36)}`;

    const ref: BookingRef | undefined = p.property_token
      ? {
          provider: "serpapi",
          kind: "stay",
          params: {
            property_token: p.property_token,
            q: ctx.query,
            check_in_date: ctx.checkIn,
            check_out_date: ctx.checkOut,
            adults: String(ctx.guests),
            ...(p.link ? { link: p.link } : {}),
          },
        }
      : p.link
        ? { provider: "serpapi", kind: "stay", params: { link: p.link } }
        : undefined;

    out.set(id, {
      id,
      provider: "serpapi",
      name: p.name,
      type: stayTypeOf(p),
      neighborhood: "",
      location,
      distanceFromCenterKm: Math.round(haversineKm(location, ctx.center) * 10) / 10,
      // Google usa una scala 0-5: la portiamo a 0-10 come nel resto dell'app
      rating: p.overall_rating ? Math.min(10, Math.round(p.overall_rating * 20) / 10) : 0,
      reviewsCount: Math.max(0, Math.round(p.reviews ?? 0)),
      pricePerNight,
      priceTotal,
      nights,
      checkIn: ctx.checkIn,
      checkOut: ctx.checkOut,
      amenities,
      freeCancellation: p.free_cancellation === true,
      breakfastIncluded: (p.amenities ?? []).some((a) => /free breakfast|colazione (gratuita|inclusa)|breakfast included/i.test(a)),
      imageUrl: p.images?.[0]?.thumbnail ?? p.images?.[0]?.original_image ?? "",
      conditions: [
        p.free_cancellation ? "Cancellazione gratuita (come indicato da Google Hotels)" : "Condizioni di cancellazione: verifica sul sito del venditore",
        "Tasse e costi finali sono quelli mostrati dal venditore",
      ],
      fetchedAt: ctx.fetchedAt,
      bookingRef: ref,
    });
    if (out.size >= limit) break;
  }

  if (raw.length > 0 && out.size === 0) {
    console.error(`[serpapi] ${raw.length} strutture ricevute ma nessuna utilizzabile (${skipped} scartate)`);
    throw new ProviderError("unavailable", "Il servizio prezzi ha restituito dati in un formato inatteso.");
  }
  return [...out.values()];
}

// ───────── Venditori di una struttura ─────────

const sellerSchema = z
  .object({
    source: z.string().optional(),
    link: z.string().optional(),
    rate_per_night: priceSchema.optional(),
    total_rate: priceSchema.optional(),
    num_guests: z.number().optional(),
  })
  .passthrough();

export function parseHotelSellers(json: Record<string, unknown>, ref: BookingRef, nights: number): BookingOption[] {
  const raw = [...(Array.isArray(json.featured_prices) ? (json.featured_prices as unknown[]) : []), ...(Array.isArray(json.prices) ? (json.prices as unknown[]) : [])];
  const bySeller = new Map<string, BookingOption>();
  for (const item of raw) {
    const parsed = sellerSchema.safeParse(item);
    if (!parsed.success || !parsed.data.link || !parsed.data.source) continue;
    const s = parsed.data;
    const total = s.total_rate?.extracted_lowest ?? (s.rate_per_night?.extracted_lowest && nights > 0 ? s.rate_per_night.extracted_lowest * nights : null);
    const option = toBookingOption(s.source!, total != null ? Math.round(total) : null, undefined, { url: s.link! });
    const key = s.source!.toLowerCase();
    const existing = bySeller.get(key);
    if (option && (!existing || (option.price ?? Infinity) < (existing.price ?? Infinity))) bySeller.set(key, option);
  }
  const options = [...bySeller.values()].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  // Se Google non elenca venditori, resta la pagina della struttura su Google Hotels
  if (!options.length && ref.params.link) {
    const fallback = toBookingOption("Google Hotels", null, "Confronta i prezzi dei venditori su Google", { url: ref.params.link });
    if (fallback) options.push(fallback);
  }
  return options;
}
