/**
 * ⚠️ MOCK — strutture ricettive INVENTATE (nomi generici), deterministiche per (meta, date, ospiti).
 */
import type { AccommodationOffer, AccommodationType, BookingOption } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { diffDays, parseISODate } from "@/lib/time";
import { pick, seededRandom } from "@/lib/random";
import { DESTINATIONS, NEIGHBORHOODS } from "@/server/mock-data/destinations";
import { ProviderError } from "../errors";
import type { AccommodationProvider, AccommodationSearchQuery } from "../types";
import { simulateNetwork } from "./simulate";

const IMAGES: Record<AccommodationType, string[]> = {
  hotel: ["photo-1566073771259-6a8506099945", "photo-1582719478250-c89cae4dc85b", "photo-1590490360182-c33d57733427", "photo-1571896349842-33c89424de2d"],
  appartamento: ["photo-1522708323590-d24dbb6b0267", "photo-1502672260266-1c1ef2d93688", "photo-1560448204-e02f11c3d0e2"],
  ostello: ["photo-1555854877-bab0e564b8d5", "photo-1520277739336-7bf67edfa768"],
  resort: ["photo-1520250497591-112f2f40a3f4", "photo-1571003123894-1f0594d2b5d9"],
  bnb: ["photo-1505693416388-ac5ce068fe85", "photo-1631049307264-da0ec9d70304"],
};

const NAME_TEMPLATES: Record<AccommodationType, ((nb: string, city: string) => string)[]> = {
  hotel: [(nb) => `Hotel Central ${nb}`, (nb) => `${nb} Suites`, (_, c) => `Urban Hotel ${c}`, (nb) => `Hotel Piazza ${nb}`],
  appartamento: [(nb) => `Appartamento luminoso a ${nb}`, (nb) => `Loft con terrazza – ${nb}`, (nb) => `Bilocale design a ${nb}`, (nb) => `Casa con balcone a ${nb}`],
  ostello: [(_, c) => `${c} Social Hostel`, (nb) => `Ostello ${nb} Backpackers`, (nb) => `Generation Hostel ${nb}`],
  resort: [(_, c) => `Resort sul mare di ${c}`, (nb) => `Beach Resort ${nb}`],
  bnb: [(nb) => `B&B Casa ${nb}`, (nb) => `La Corte di ${nb}`, (nb) => `Guesthouse ${nb}`],
};

const AMENITIES: Record<AccommodationType, string[]> = {
  hotel: ["Wi-Fi", "Aria condizionata", "Reception 24h", "Colazione", "Palestra", "Ascensore", "Deposito bagagli"],
  appartamento: ["Wi-Fi", "Cucina", "Lavatrice", "Aria condizionata", "Terrazza", "Self check-in"],
  ostello: ["Wi-Fi", "Cucina in comune", "Armadietti", "Bar", "Eventi serali", "Lavanderia"],
  resort: ["Wi-Fi", "Piscina", "Spiaggia privata", "Spa", "Ristorante", "Aria condizionata", "Parcheggio"],
  bnb: ["Wi-Fi", "Colazione", "Aria condizionata", "Giardino", "Host disponibile"],
};

const TYPE_PRICE: Record<AccommodationType, number> = { hotel: 1.15, appartamento: 1, ostello: 0.32, resort: 1.9, bnb: 0.85 };

function season(month: number): number {
  return month === 8 ? 1.4 : month === 7 ? 1.25 : [6, 9, 12].includes(month) ? 1.1 : [1, 2, 11].includes(month) ? 0.85 : 1;
}

function generate(q: AccommodationSearchQuery): AccommodationOffer[] {
  const dest = DESTINATIONS.find((d) => d.id === q.destinationId);
  if (!dest) throw new ProviderError("not_found", "Destinazione non trovata");
  const nights = diffDays(q.checkIn, q.checkOut);
  if (nights <= 0) throw new ProviderError("invalid_input", "La data di check-out deve essere successiva al check-in");

  const neighborhoods = NEIGHBORHOODS[dest.id] ?? [[dest.name, dest.location.lat, dest.location.lng]];
  const rnd = seededRandom(`${dest.id}-${q.checkIn}-${q.checkOut}-${q.guests}`);
  const month = parseISODate(q.checkIn).getUTCMonth() + 1;
  const types: AccommodationType[] = ["hotel", "hotel", "appartamento", "appartamento", "ostello", "bnb"];
  if (dest.categories.includes("mare")) types.push("resort");

  const offers: AccommodationOffer[] = [];
  const count = 14 + Math.floor(rnd() * 4);
  for (let i = 0; i < count; i++) {
    const type = pick(rnd, types);
    const [nbName, nbLat, nbLng] = pick(rnd, neighborhoods);
    const location = { lat: nbLat + (rnd() - 0.5) * 0.006, lng: nbLng + (rnd() - 0.5) * 0.008 };
    const distanceFromCenterKm = Math.round(haversineKm(location, dest.location) * 10) / 10;

    const rooms = type === "ostello" ? q.guests : type === "appartamento" ? 1 + Math.max(0, q.guests - 2) * 0.3 : Math.ceil(q.guests / 2);
    let perNight = dest.avgNightlyPrice * TYPE_PRICE[type] * rooms * season(month);
    perNight *= Math.max(0.75, 1.2 - distanceFromCenterKm * 0.05);
    perNight *= 0.78 + rnd() * 0.5;
    const pricePerNight = Math.round(perNight);
    const rating = Math.round((6.8 + rnd() * 2.6 + (type === "resort" ? 0.3 : 0)) * 10) / 10;
    const freeCancellation = rnd() < 0.55;
    const breakfastIncluded = (type === "hotel" || type === "bnb" || type === "resort") && rnd() < 0.5;
    const pool = AMENITIES[type];
    const amenities = pool.filter(() => rnd() < 0.7).slice(0, 5);
    if (breakfastIncluded && !amenities.includes("Colazione")) amenities.unshift("Colazione");

    offers.push({
      id: `mock-acc~${dest.id}~${q.checkIn}~${q.checkOut}~${q.guests}~${i}`,
      provider: "mock",
      name: pick(rnd, NAME_TEMPLATES[type])(nbName, dest.name),
      type,
      neighborhood: nbName,
      location,
      distanceFromCenterKm,
      rating: Math.min(9.9, rating),
      reviewsCount: 30 + Math.floor(rnd() * 2400),
      pricePerNight,
      priceTotal: pricePerNight * nights,
      nights,
      checkIn: q.checkIn,
      checkOut: q.checkOut,
      amenities,
      freeCancellation,
      breakfastIncluded,
      imageUrl: `https://images.unsplash.com/${pick(rnd, IMAGES[type])}`,
      conditions: [
        freeCancellation ? "Cancellazione gratuita fino a 48h prima" : "Non rimborsabile",
        type === "ostello" ? "Prezzo per posti letto in dormitorio" : "Tassa di soggiorno da pagare in loco",
      ],
    });
  }
  return offers;
}

export class MockAccommodationProvider implements AccommodationProvider {
  readonly name = "mock";
  readonly isMock = true;
  readonly metered = false;

  async getBookingOptions(): Promise<BookingOption[]> {
    throw new ProviderError("unavailable", "I dati dimostrativi non hanno link di prenotazione reali.");
  }

  async search(query: AccommodationSearchQuery): Promise<AccommodationOffer[]> {
    await simulateNetwork("alloggi");
    return generate(query);
  }

  async getOffer(offerId: string): Promise<AccommodationOffer | null> {
    const [prefix, destinationId, checkIn, checkOut, guests, idx] = offerId.split("~");
    if (prefix !== "mock-acc" || !destinationId) return null;
    try {
      return generate({ destinationId, checkIn, checkOut, guests: Number(guests) || 1 })[Number(idx)] ?? null;
    } catch {
      return null;
    }
  }
}
