/**
 * ⚠️ MOCK — genera offerte volo plausibili ma FINTE, deterministiche per (tratta, data).
 * Le compagnie sono reali solo come etichette: orari, prezzi e numeri di volo sono inventati.
 */
import type { Airport, BookingOption, FlightOffer } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { parseISODate } from "@/lib/time";
import { pick, seededRandom } from "@/lib/random";
import { findAirport, ORIGIN_AIRPORTS } from "@/server/mock-data/airports";
import { ProviderError } from "../errors";
import type { FlightProvider, FlightSearchQuery, RoundTripQuote, RoundTripQuoteQuery } from "../types";
import { simulateNetwork } from "./simulate";

type Carrier = { code: string; name: string; lowCost: boolean };

const LOW_COST: Carrier[] = [
  { code: "FR", name: "Ryanair", lowCost: true },
  { code: "U2", name: "easyJet", lowCost: true },
  { code: "W6", name: "Wizz Air", lowCost: true },
  { code: "V7", name: "Volotea", lowCost: true },
  { code: "VY", name: "Vueling", lowCost: true },
];

const LEGACY: Record<string, Carrier> = {
  AZ: { code: "AZ", name: "ITA Airways", lowCost: false },
  LH: { code: "LH", name: "Lufthansa", lowCost: false },
  AF: { code: "AF", name: "Air France", lowCost: false },
  KL: { code: "KL", name: "KLM", lowCost: false },
  IB: { code: "IB", name: "Iberia", lowCost: false },
  TP: { code: "TP", name: "TAP Air Portugal", lowCost: false },
  A3: { code: "A3", name: "Aegean", lowCost: false },
  TK: { code: "TK", name: "Turkish Airlines", lowCost: false },
  BA: { code: "BA", name: "British Airways", lowCost: false },
  QR: { code: "QR", name: "Qatar Airways", lowCost: false },
  AY: { code: "AY", name: "Finnair", lowCost: false },
  FI: { code: "FI", name: "Icelandair", lowCost: false },
  AT: { code: "AT", name: "Royal Air Maroc", lowCost: false },
  LO: { code: "LO", name: "LOT Polish", lowCost: false },
  KM: { code: "KM", name: "KM Malta Airlines", lowCost: false },
  NH: { code: "NH", name: "ANA", lowCost: false },
  DL: { code: "DL", name: "Delta", lowCost: false },
};

/** Compagnia di bandiera associata al paese dell'aeroporto */
const FLAG_BY_COUNTRY: Record<string, string> = {
  Spagna: "IB", Francia: "AF", "Regno Unito": "BA", Portogallo: "TP", "Paesi Bassi": "KL", Germania: "LH",
  Grecia: "A3", Turchia: "TK", Islanda: "FI", Marocco: "AT", Polonia: "LO", Malta: "KM", Giappone: "NH",
  "Stati Uniti": "DL", Italia: "AZ",
};

const TZ_BY_COUNTRY: Record<string, string> = {
  Italia: "Europe/Rome", Spagna: "Europe/Madrid", Francia: "Europe/Paris", "Regno Unito": "Europe/London",
  Portogallo: "Europe/Lisbon", "Paesi Bassi": "Europe/Amsterdam", Germania: "Europe/Berlin",
  "Repubblica Ceca": "Europe/Prague", Ungheria: "Europe/Budapest", Grecia: "Europe/Athens",
  Giappone: "Asia/Tokyo", "Stati Uniti": "America/New_York", Marocco: "Africa/Casablanca",
  Islanda: "Atlantic/Reykjavik", Polonia: "Europe/Warsaw", Croazia: "Europe/Zagreb", Turchia: "Europe/Istanbul",
  Malta: "Europe/Malta", Qatar: "Asia/Qatar", Finlandia: "Europe/Helsinki",
};

const HUBS_SHORT = ["FRA", "MUC", "AMS", "CDG", "MAD"];
const HUBS_LONG: Record<string, string> = { TK: "IST", QR: "DOH", LH: "FRA", AF: "CDG", AY: "HEL", KL: "AMS" };

function tzOffsetMinutes(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUTC - date.getTime()) / 60000);
}

function localIso(dateIso: string, minutesFromMidnight: number): string {
  const d = parseISODate(dateIso);
  d.setUTCMinutes(minutesFromMidnight);
  return d.toISOString().slice(0, 16);
}

function seasonFactor(month: number): number {
  if (month === 8) return 1.45;
  if (month === 7) return 1.3;
  if (month === 6 || month === 9 || month === 12) return 1.15;
  if (month === 1 || month === 2 || month === 11) return 0.82;
  return 1;
}

function weekdayFactor(dow: number): number {
  if (dow === 5 || dow === 0) return 1.18; // venerdì, domenica
  if (dow === 2 || dow === 3) return 0.88; // martedì, mercoledì
  return 1;
}

function generate(query: FlightSearchQuery): FlightOffer[] {
  const from = findAirport(query.from);
  const to = findAirport(query.to);
  if (!from || !to) throw new ProviderError("invalid_input", "Aeroporto non riconosciuto");
  if (from.code === to.code) throw new ProviderError("invalid_input", "Partenza e destinazione coincidono");

  const date = parseISODate(query.date);
  const month = date.getUTCMonth() + 1;
  const dist = haversineKm(from.location, to.location);
  const longHaul = dist > 3500;
  const rnd = seededRandom(`${from.code}-${to.code}-${query.date}`);

  const fromTz = TZ_BY_COUNTRY[from.country] ?? "Europe/Rome";
  const toTz = TZ_BY_COUNTRY[to.country] ?? "Europe/Rome";
  const tzDelta = tzOffsetMinutes(toTz, date) - tzOffsetMinutes(fromTz, date);

  const flag = LEGACY[FLAG_BY_COUNTRY[to.country] ?? "AZ"] ?? LEGACY.AZ;
  const originFlag = LEGACY[FLAG_BY_COUNTRY[from.country] ?? "AZ"] ?? LEGACY.AZ;
  const carriers: Carrier[] = longHaul
    ? [LEGACY.TK, LEGACY.QR, LEGACY.LH, LEGACY.AF, LEGACY.AY, originFlag, flag]
    : [...LOW_COST, ...LOW_COST, flag, originFlag, LEGACY.LH];

  const count = 8 + Math.floor(rnd() * 5);
  const offers: FlightOffer[] = [];

  for (let i = 0; i < count; i++) {
    const carrier = pick(rnd, carriers);
    const departMin = Math.round((6 * 60 + rnd() * (16 * 60)) / 5) * 5; // 06:00 → 22:00
    const directPossible = longHaul
      ? carrier.code === originFlag.code || carrier.code === flag.code
      : carrier.lowCost || rnd() < 0.7;
    const stops = directPossible ? 0 : 1;
    const hub = longHaul ? HUBS_LONG[carrier.code] ?? "FRA" : pick(rnd, HUBS_SHORT);
    const flightMin = Math.round((dist / (longHaul ? 830 : 760)) * 60 + 35);
    const layover = stops ? 60 + Math.round(rnd() * 150) : 0;
    const durationMin = stops ? Math.round(flightMin * 1.12) + layover : flightMin;

    let price = longHaul ? 280 + dist * 0.045 : 28 + dist * 0.055;
    price *= seasonFactor(month) * weekdayFactor(date.getUTCDay());
    price *= carrier.lowCost ? 0.72 : longHaul ? 1 : 1.2;
    if (departMin < 7 * 60 || departMin > 20 * 60) price *= 0.85;
    if (stops) price *= longHaul ? 0.82 : 0.9;
    price *= 0.8 + rnd() * 0.5;

    const checked = longHaul || (!carrier.lowCost && rnd() < 0.45);
    const refundable = !carrier.lowCost && rnd() < 0.25;
    const conditions = carrier.lowCost
      ? ["Solo borsa piccola sotto il sedile", "Trolley e stiva a pagamento", "Cambio data con supplemento"]
      : [
          "Bagaglio a mano incluso",
          checked ? "Bagaglio in stiva 23 kg incluso" : "Stiva a pagamento",
          refundable ? "Rimborsabile con penale" : "Non rimborsabile",
        ];

    offers.push({
      id: `mock-fl~${from.code}~${to.code}~${query.date}~${query.travelers}~${i}`,
      provider: "mock",
      airline: carrier.name,
      airlineCode: carrier.code,
      flightNumber: `${carrier.code}${100 + Math.floor(rnd() * 8900)}`,
      fromCode: from.code,
      toCode: to.code,
      fromCity: from.city,
      toCity: to.city,
      departAt: localIso(query.date, departMin),
      arriveAt: localIso(query.date, departMin + durationMin + tzDelta),
      durationMin,
      stops,
      stopCodes: stops ? [hub] : [],
      price: Math.round(price),
      baggage: { cabin: !carrier.lowCost, checked },
      conditions,
      refundable,
    });
  }
  return offers;
}

export class MockFlightProvider implements FlightProvider {
  readonly name = "mock";
  readonly isMock = true;
  readonly metered = false;

  async quoteRoundTrip(q: RoundTripQuoteQuery): Promise<RoundTripQuote> {
    try {
      const [out, back] = [generate({ from: q.from, to: q.to, date: q.depart, travelers: 1 }), generate({ from: q.to, to: q.from, date: q.ret, travelers: 1 })];
      return { status: "hit", price: Math.min(...out.map((f) => f.price)) + Math.min(...back.map((f) => f.price)), fetchedAt: new Date().toISOString() };
    } catch {
      return { status: "none" };
    }
  }

  async getBookingOptions(): Promise<BookingOption[]> {
    throw new ProviderError("unavailable", "I dati dimostrativi non hanno link di prenotazione reali.");
  }

  async search(query: FlightSearchQuery): Promise<FlightOffer[]> {
    await simulateNetwork("voli");
    return generate(query);
  }

  async getOffer(offerId: string): Promise<FlightOffer | null> {
    const [prefix, from, to, date, travelers, idx] = offerId.split("~");
    if (prefix !== "mock-fl" || !from || !to || !date) return null;
    try {
      const offers = generate({ from, to, date, travelers: Number(travelers) || 1 });
      return offers[Number(idx)] ?? null;
    } catch {
      return null;
    }
  }

  async getAirport(code: string): Promise<Airport | null> {
    return findAirport(code) ?? null;
  }

  async listOriginAirports(): Promise<Airport[]> {
    return ORIGIN_AIRPORTS;
  }
}
