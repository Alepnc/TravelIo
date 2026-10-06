/**
 * Contratti dei provider esterni. I servizi applicativi dipendono SOLO da queste interfacce:
 * sostituire i mock con API reali (Duffel, Amadeus, Booking, Google Places, Mapbox…) significa
 * scrivere un nuovo adapter e registrarlo in `./index.ts`.
 */
import type {
  AccommodationOffer,
  Airport,
  BookingOption,
  BookingRef,
  Destination,
  DestinationCategory,
  FlightOffer,
  LatLng,
  PointOfInterest,
} from "@/lib/types";
import type { TravelMode } from "@/lib/geo";

interface ProviderMeta {
  readonly name: string;
  /** true se i dati sono dimostrativi: la UI mostra il badge "Dati dimostrativi" */
  readonly isMock: boolean;
}

export interface FlightSearchQuery {
  from: string; // IATA
  to: string; // IATA
  date: string; // YYYY-MM-DD
  travelers: number;
}

export interface RoundTripQuoteQuery {
  from: string;
  to: string;
  depart: string;
  ret: string;
}

/** Esito di una richiesta di prezzo indicativo A/R (pagine di scoperta). */
export type RoundTripQuote =
  | { status: "hit"; price: number; fetchedAt: string }
  /** Nessun volo disponibile per quelle date */
  | { status: "none" }
  /** Non in cache e (cacheOnly) non richiesto: il prezzo esiste ma non è stato ancora rilevato */
  | { status: "miss" };

export interface FlightProvider extends ProviderMeta {
  /** true se ogni ricerca ha un costo/quota: la UI e i servizi evitano chiamate superflue */
  readonly metered: boolean;
  search(query: FlightSearchQuery): Promise<FlightOffer[]>;
  /**
   * Prezzo A/R per persona, il più basso trovato. Con `cacheOnly` non spende quota:
   * restituisce "miss" se il prezzo non è già noto.
   */
  quoteRoundTrip(query: RoundTripQuoteQuery, opts: { cacheOnly: boolean }): Promise<RoundTripQuote>;
  /** Venditori verso cui rimandare l'utente per prenotare un'offerta */
  getBookingOptions(ref: BookingRef): Promise<BookingOption[]>;
  /** Rilegge un'offerta per id: il prezzo salvato non arriva mai dal client */
  getOffer(offerId: string): Promise<FlightOffer | null>;
  getAirport(code: string): Promise<Airport | null>;
  listOriginAirports(): Promise<Airport[]>;
}

export interface AccommodationSearchQuery {
  destinationId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface AccommodationProvider extends ProviderMeta {
  readonly metered: boolean;
  search(query: AccommodationSearchQuery): Promise<AccommodationOffer[]>;
  getBookingOptions(ref: BookingRef): Promise<BookingOption[]>;
  getOffer(offerId: string): Promise<AccommodationOffer | null>;
}

export interface DestinationFilter {
  category?: DestinationCategory;
  month?: number;
  q?: string;
}

export interface DestinationProvider extends ProviderMeta {
  list(filter?: DestinationFilter): Promise<Destination[]>;
  get(id: string): Promise<Destination | null>;
  getByAirport(code: string): Promise<Destination | null>;
}

export interface ActivityProvider extends ProviderMeta {
  listForDestination(destinationId: string): Promise<PointOfInterest[]>;
  get(poiId: string): Promise<PointOfInterest | null>;
}

export interface TravelEstimate {
  minutes: number;
  mode: TravelMode;
  km: number;
}

export interface MapsProvider extends ProviderMeta {
  /**
   * Stima sincrona usata dall'algoritmo di itinerario. Un provider reale (OSRM, Mapbox)
   * dovrebbe precaricare una matrice con `prepare()` e rispondere da cache qui.
   */
  estimate(a: LatLng, b: LatLng): TravelEstimate;
  prepare?(points: LatLng[]): Promise<void>;
}
