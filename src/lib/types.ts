/**
 * Tipi di dominio condivisi tra client e server.
 * Non importare qui nulla di specifico del server (db, provider).
 */

export type LatLng = { lat: number; lng: number };

export type DestinationCategory =
  | "mare"
  | "nightlife"
  | "natura"
  | "cultura"
  | "avventura"
  | "citta"
  | "weekend"
  | "economici";

export type Climate = "mediterraneo" | "continentale" | "oceanico" | "tropicale" | "arido" | "subartico";

export interface Destination {
  id: string; // slug, es. "barcellona"
  name: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  airportCode: string; // IATA principale
  location: LatLng;
  imageUrl: string;
  tagline: string;
  description: string;
  categories: DestinationCategory[];
  climate: Climate;
  bestMonths: number[]; // 1-12
  /** Costo medio notte in alloggio economico/medio (EUR, per camera doppia) */
  avgNightlyPrice: number;
  /** Spesa giornaliera media per persona per cibo e trasporti locali (EUR) */
  dailyCost: number;
  currency: string;
  timezone: string;
  highlights: string[];
}

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
  location: LatLng;
}

/**
 * Riferimento opaco per ottenere i link di prenotazione di un'offerta. Lo interpreta solo il provider
 * che l'ha creato; i servizi lo salvano e lo restituiscono senza guardarci dentro.
 */
export interface BookingRef {
  provider: string;
  kind: "flight" | "stay";
  params: Record<string, string>;
}

/** Un venditore (compagnia aerea, agenzia online, hotel) verso cui rimandare l'utente. */
export interface BookingOption {
  seller: string;
  /** Prezzo indicato dal venditore, se disponibile (EUR, totale per ciò che è stato cercato) */
  price: number | null;
  note?: string;
  url: string;
  /** POST: l'utente viene portato al venditore con un form (alcuni provider non danno un link semplice) */
  method: "GET" | "POST";
  fields?: Record<string, string>;
}

export interface FlightOffer {
  id: string;
  provider: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  fromCode: string;
  toCode: string;
  fromCity: string;
  toCity: string;
  departAt: string; // ISO locale "YYYY-MM-DDTHH:mm"
  arriveAt: string;
  durationMin: number;
  stops: number;
  stopCodes: string[];
  /** Prezzo per persona (EUR) */
  price: number;
  /** null = il provider non lo comunica nei risultati: si verifica sul sito del venditore */
  baggage: { cabin: boolean | null; checked: boolean | null };
  conditions: string[];
  refundable: boolean;
  /** Momento in cui il prezzo è stato rilevato (ISO UTC) */
  fetchedAt?: string;
  bookingRef?: BookingRef;
}

export type AccommodationType = "hotel" | "appartamento" | "ostello" | "resort" | "bnb";

export interface AccommodationOffer {
  id: string;
  provider: string;
  name: string;
  type: AccommodationType;
  /** Può essere vuoto se il provider non indica il quartiere */
  neighborhood: string;
  location: LatLng;
  distanceFromCenterKm: number;
  /** 0-10; 0 = nessuna recensione */
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  priceTotal: number;
  nights: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  amenities: string[];
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  /** Può essere vuoto: la UI mostra un segnaposto */
  imageUrl: string;
  conditions: string[];
  fetchedAt?: string;
  bookingRef?: BookingRef;
}

export type ActivityCategory =
  | "attrazione"
  | "museo"
  | "ristorante"
  | "natura"
  | "nightlife"
  | "shopping"
  | "trasporto"
  | "alloggio"
  | "volo"
  | "esperienza"
  | "altro";

export interface OpeningHours {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
}

/** Punto di interesse proposto dall'ActivityProvider */
export interface PointOfInterest {
  id: string;
  destinationId: string;
  name: string;
  category: ActivityCategory;
  location: LatLng;
  durationMin: number;
  cost: number; // per persona, EUR
  opening: OpeningHours;
  tags: string[];
  popularity: number; // 0-1
  description: string;
  /** Momento della giornata preferito */
  bestTime?: "mattina" | "pomeriggio" | "sera";
}

export type TripStatus = "pianificazione" | "confermato" | "in_corso" | "completato";

export type TripPace = "rilassato" | "bilanciato" | "intenso";

export type ActivitySource = "generated" | "user" | "assistant";

export interface ItineraryActivity {
  id: string;
  dayId: string;
  position: number;
  title: string;
  category: ActivityCategory;
  startTime: string; // "HH:mm"
  durationMin: number;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  cost: number; // per persona
  notes: string | null;
  poiId: string | null;
  source: ActivitySource;
  isUserModified: boolean;
  timeLocked: boolean;
  /** Minuti di spostamento dall'attività precedente (calcolato) */
  travelMinFromPrev: number | null;
}

export interface ItineraryDay {
  id: string;
  dayIndex: number;
  date: string; // YYYY-MM-DD
  title: string;
  isUserModified: boolean;
  activities: ItineraryActivity[];
}

export interface Itinerary {
  id: string;
  tripId: string;
  pace: TripPace;
  generatedAt: string;
  days: ItineraryDay[];
}

export type ExpenseCategory = "voli" | "alloggio" | "trasporti" | "attivita" | "cibo" | "altro";

export const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; emoji: string }[] = [
  { key: "voli", label: "Voli", emoji: "✈️" },
  { key: "alloggio", label: "Alloggio", emoji: "🏨" },
  { key: "trasporti", label: "Trasporti", emoji: "🚇" },
  { key: "attivita", label: "Attività", emoji: "🎟️" },
  { key: "cibo", label: "Cibo", emoji: "🍝" },
  { key: "altro", label: "Altro", emoji: "🧾" },
];

export interface SearchParams {
  from?: string; // IATA
  to?: string; // destination id
  depart?: string; // YYYY-MM-DD
  ret?: string;
  month?: number; // ricerca flessibile
  travelers: number;
  budget?: number; // per persona
}
