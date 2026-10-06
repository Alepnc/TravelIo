/** Oggetti di trasferimento server → client per il dominio Viaggio. */
import type {
  AccommodationType,
  ExpenseCategory,
  Itinerary,
  LatLng,
  TripPace,
  TripStatus,
} from "./types";

export interface TripSummary {
  id: string;
  name: string;
  destinationId: string;
  destinationName: string;
  country: string;
  countryCode: string;
  location: LatLng;
  imageUrl: string;
  originCode: string | null;
  startDate: string;
  endDate: string;
  travelersCount: number;
  budgetPerPerson: number | null;
  pace: TripPace;
  status: TripStatus;
  updatedAt: string;
}

export interface TripFlight {
  id: string;
  direction: "andata" | "ritorno";
  offerId: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  fromCode: string;
  toCode: string;
  departAt: string;
  arriveAt: string;
  durationMin: number;
  stops: number;
  pricePerPerson: number;
  /** Il volo ha un riferimento per riaprire i link di prenotazione */
  canBook: boolean;
  baggage: { cabin: boolean | null; checked: boolean | null };
  conditions: string[];
}

export interface TripStay {
  id: string;
  offerId: string;
  name: string;
  type: AccommodationType;
  neighborhood: string;
  location: LatLng;
  rating: number;
  reviewsCount: number;
  pricePerNight: number;
  priceTotal: number;
  checkIn: string;
  checkOut: string;
  freeCancellation: boolean;
  imageUrl: string;
  canBook: boolean;
}

export interface TripExpense {
  id: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  spentAt: string | null;
}

export interface TripDetail extends TripSummary {
  travelers: { id: string; name: string; isOwner: boolean }[];
  flights: TripFlight[];
  stay: TripStay | null;
  itinerary: Itinerary | null;
  expenses: TripExpense[];
  /** Spesa giornaliera media della destinazione (cibo + trasporti locali) per persona */
  destinationDailyCost: number;
}

export const STATUS_META: Record<TripStatus, { label: string; tone: string }> = {
  pianificazione: { label: "Pianificazione", tone: "bg-amber-100 text-amber-800" },
  confermato: { label: "Confermato", tone: "bg-emerald-100 text-emerald-800" },
  in_corso: { label: "In corso", tone: "bg-sky-100 text-sky-800" },
  completato: { label: "Completato", tone: "bg-stone-200 text-stone-700" },
};
