/**
 * Generatori di risposte nel FORMATO documentato da SerpApi (google_flights / google_hotels).
 * Servono ai test e al server di prova (`scripts/fake-serpapi.ts`): NON sono dati di mercato e
 * non vanno mai usati come provider dell'app.
 */
import { DESTINATIONS } from "../src/server/mock-data/destinations";
import { findAirport } from "../src/server/mock-data/airports";
import { hashString, seededRandom } from "../src/lib/random";

type Json = Record<string, unknown>;

const CARRIERS: [string, string][] = [["Ryanair", "FR"], ["easyJet", "U2"], ["Wizz Air", "W6"], ["ITA Airways", "AZ"], ["Vueling", "VY"]];

const pad = (n: number) => String(n).padStart(2, "0");
const addMinutes = (date: string, hhmm: number, add: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMinutes(hhmm + add);
  return `${d.toISOString().slice(0, 10)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

export function flightsResponse(p: { dep: string; arr: string; date: string; roundTrip?: boolean }): Json {
  const rnd = seededRandom(`${p.dep}-${p.arr}-${p.date}-${p.roundTrip ? "rt" : "ow"}`);
  const dep = findAirport(p.dep);
  const arr = findAirport(p.arr);
  const itineraries = Array.from({ length: 7 }, (_, i) => {
    const [name, code] = CARRIERS[Math.floor(rnd() * CARRIERS.length)];
    const start = 6 * 60 + Math.floor(rnd() * 14 * 60);
    const stops = rnd() < 0.3 ? 1 : 0;
    const dur = 110 + Math.floor(rnd() * 60);
    const flightNo = `${code} ${1000 + Math.floor(rnd() * 8000)}`;
    const price = Math.round((p.roundTrip ? 110 : 55) + rnd() * (p.roundTrip ? 200 : 140));
    const mid = { id: "FRA", name: "Frankfurt Airport" };
    const segs = stops
      ? [
          { departure_airport: { name: dep?.name, id: p.dep, time: addMinutes(p.date, start, 0) }, arrival_airport: { name: mid.name, id: mid.id, time: addMinutes(p.date, start, dur) }, duration: dur, airline: name, flight_number: flightNo, travel_class: "Economy" },
          { departure_airport: { name: mid.name, id: mid.id, time: addMinutes(p.date, start, dur + 90) }, arrival_airport: { name: arr?.name, id: p.arr, time: addMinutes(p.date, start, dur * 2 + 90) }, duration: dur, airline: name, flight_number: `${code} ${2000 + i}`, travel_class: "Economy" },
        ]
      : [{ departure_airport: { name: dep?.name, id: p.dep, time: addMinutes(p.date, start, 0) }, arrival_airport: { name: arr?.name, id: p.arr, time: addMinutes(p.date, start, dur) }, duration: dur, airline: name, flight_number: flightNo, travel_class: "Economy" }];
    return {
      flights: segs,
      ...(stops ? { layovers: [{ duration: 90, name: mid.name, id: mid.id }] } : {}),
      total_duration: stops ? dur * 2 + 90 : dur,
      carbon_emissions: { this_flight: 90000 },
      price,
      type: p.roundTrip ? "Round trip" : "One way",
      airline_logo: `https://www.gstatic.com/flights/airline_logos/70px/${code}.png`,
      booking_token: Buffer.from(`${p.dep}|${p.arr}|${p.date}|${i}|${hashString(flightNo)}`).toString("base64url"),
    };
  });
  return { search_metadata: { status: "Success" }, best_flights: itineraries.slice(0, 2), other_flights: itineraries.slice(2) };
}

export function flightBookingResponse(token: string): Json {
  const [dep, arr, date, idx] = Buffer.from(token, "base64url").toString().split("|");
  const base = 60 + (hashString(token) % 80);
  return {
    search_metadata: { status: "Success" },
    booking_options: [
      { together: { book_with: "Compagnia aerea", airline_logos: [], marketed_as: [`${dep}-${arr}`], price: base, option_title: "Basic Economy", extensions: [], baggage_prices: ["Trolley: a pagamento"], booking_request: { url: "https://www.google.com/travel/clk/f", post_data: `u=${encodeURIComponent(`${dep}${arr}${date}${idx}`)}&t=1` } } },
      { together: { book_with: "Agenzia online di prova", marketed_as: [], price: base + 7, option_title: "Standard", booking_request: { url: "https://www.google.com/travel/clk/f", post_data: `u=agency-${idx}&t=2` } } },
    ],
  };
}

const HOTEL_NAMES = ["Hotel Centrale", "Grand Plaza", "Boutique Rooftop", "Hostel Backpackers", "Residenza Vecchia", "B&B La Terrazza", "Urban Loft Apartment", "Hotel Marina Resort"];

export function hotelsResponse(p: { q: string; checkIn: string; checkOut: string; adults: number }): Json {
  const dest = DESTINATIONS.find((d) => p.q.toLowerCase().includes(d.name.toLowerCase()));
  if (!dest) return { error: "Google Hotels hasn't returned any results for this query." };
  const rnd = seededRandom(`${dest.id}-${p.checkIn}-${p.checkOut}-${p.adults}`);
  const nights = Math.max(1, Math.round((Date.parse(p.checkOut) - Date.parse(p.checkIn)) / 86_400_000));
  const properties = HOTEL_NAMES.map((name, i) => {
    const perNight = Math.round(dest.avgNightlyPrice * (0.4 + rnd() * 1.1));
    const withPrice = i !== 6; // una struttura senza prezzo: va scartata
    return {
      type: /Hostel/.test(name) ? "hostel" : /Apartment/.test(name) ? "vacation rental" : "hotel",
      name,
      description: `${name} a ${dest.name}`,
      link: `https://www.google.com/travel/hotels/entity/${hashString(name + dest.id).toString(36)}`,
      property_token: `tok-${dest.id}-${i}`,
      gps_coordinates: { latitude: dest.location.lat + (rnd() - 0.5) * 0.03, longitude: dest.location.lng + (rnd() - 0.5) * 0.04 },
      check_in_time: "15:00",
      ...(withPrice ? { rate_per_night: { lowest: `€${perNight}`, extracted_lowest: perNight }, total_rate: { lowest: `€${perNight * nights}`, extracted_lowest: perNight * nights } } : {}),
      overall_rating: Math.round((3.4 + rnd() * 1.5) * 10) / 10,
      reviews: 20 + Math.floor(rnd() * 3000),
      amenities: ["Free Wi-Fi", "Air-conditioned", i % 2 ? "Free breakfast" : "Kitchen", "Pool"].slice(0, 2 + (i % 3)),
      free_cancellation: i % 3 === 0,
      images: i === 3 ? [] : [{ thumbnail: `https://lh3.googleusercontent.com/fake-${i}`, original_image: `https://lh3.googleusercontent.com/fake-orig-${i}` }],
    };
  });
  return { search_metadata: { status: "Success" }, search_parameters: { q: p.q }, properties };
}

export function hotelSellersResponse(p: { token: string; checkIn: string; checkOut: string }): Json {
  const nights = Math.max(1, Math.round((Date.parse(p.checkOut) - Date.parse(p.checkIn)) / 86_400_000));
  const base = 70 + (hashString(p.token) % 60);
  const mk = (source: string, perNight: number) => ({ source, link: `https://www.${source.toLowerCase().replace(/\W/g, "")}.example.com/hotel/${p.token}`, rate_per_night: { extracted_lowest: perNight }, total_rate: { extracted_lowest: perNight * nights } });
  return { search_metadata: { status: "Success" }, featured_prices: [mk("Booking.com", base), mk("Hotel (sito ufficiale)", base + 6)], prices: [mk("Expedia", base + 4), mk("Booking.com", base + 1)] };
}
