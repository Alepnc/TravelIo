import { describe, expect, it } from "vitest";
import { flightBookingResponse, flightsResponse, hotelSellersResponse, hotelsResponse } from "../../../../scripts/serpapi-fixtures";
import { cheapestPrice, isSafeBookingUrl, parseBookingOptions, parseFlightResults } from "./parse-flights";
import { normalizeAmenities, parseHotelResults, parseHotelSellers, stayTypeOf } from "./parse-hotels";

const fctx = { from: "NAP", to: "BCN", fromCity: "Napoli", toCity: "Barcellona", date: "2027-05-13", fetchedAt: "2027-05-01T10:00:00.000Z" };

describe("voli SerpApi", () => {
  const json = flightsResponse({ dep: "NAP", arr: "BCN", date: "2027-05-13" });
  const offers = parseFlightResults(json, fctx);

  it("converte itinerari, scali, orari e prezzi per persona", () => {
    expect(offers.length).toBeGreaterThanOrEqual(5);
    for (const o of offers) {
      expect(o.price).toBeGreaterThan(0);
      expect(o.departAt).toMatch(/^2027-05-1\dT\d{2}:\d{2}$/);
      expect(o.fromCode).toBe("NAP");
      expect(o.toCode).toBe("BCN");
      expect(o.stops).toBe(o.stopCodes.length);
      expect(o.id).toMatch(/^serp-fl~NAP~BCN~2027-05-13~/);
      expect(o.bookingRef?.params.booking_token).toBeTruthy();
    }
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
  });

  it("non inventa i bagagli: sono sconosciuti", () => {
    expect(offers.every((o) => o.baggage.cabin === null && o.baggage.checked === null)).toBe(true);
  });

  it("ricava il codice compagnia dal numero di volo", () => {
    expect(offers.every((o) => /^[A-Z0-9]{2}$/.test(o.airlineCode))).toBe(true);
  });

  it("scarta gli itinerari senza prezzo ma segnala un formato inatteso se non resta nulla", () => {
    const noPrice = { best_flights: [{ flights: [(json.best_flights as { flights: unknown[] }[])[0].flights[0]] }] };
    expect(() => parseFlightResults(noPrice, fctx)).toThrow(/formato inatteso/);
    const mixed = { best_flights: [(json.best_flights as unknown[])[0], { flights: [] }, { garbage: true }] };
    expect(parseFlightResults(mixed, fctx)).toHaveLength(1);
  });

  it("una risposta vuota dà zero offerte, non un errore", () => {
    expect(parseFlightResults({}, fctx)).toEqual([]);
  });

  it("prezzo più basso per le ricerche A/R", () => {
    const rt = flightsResponse({ dep: "NAP", arr: "BCN", date: "2027-05-13", roundTrip: true });
    const prices = [...(rt.best_flights as { price: number }[]), ...(rt.other_flights as { price: number }[])].map((x) => x.price);
    expect(cheapestPrice(rt)).toBe(Math.min(...prices));
    expect(cheapestPrice({})).toBeNull();
  });
});

describe("link di prenotazione", () => {
  it("interpreta i venditori e trasforma post_data in campi di un form", () => {
    const token = (flightsResponse({ dep: "NAP", arr: "BCN", date: "2027-05-13" }).best_flights as { booking_token: string }[])[0].booking_token;
    const options = parseBookingOptions(flightBookingResponse(token));
    expect(options.length).toBe(2);
    expect(options[0].price).toBeLessThanOrEqual(options[1].price!);
    expect(options[0].method).toBe("POST");
    expect(options[0].fields).toMatchObject({ t: "1" });
    expect(options[0].url).toBe("https://www.google.com/travel/clk/f");
  });

  it("accetta solo link https verso host reali", () => {
    expect(isSafeBookingUrl("https://www.ryanair.com/x")).toBe(true);
    expect(isSafeBookingUrl("http://www.ryanair.com/x")).toBe(false);
    expect(isSafeBookingUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeBookingUrl("https://localhost/x")).toBe(false);
    expect(isSafeBookingUrl("/relativo")).toBe(false);
    const bad = { booking_options: [{ together: { book_with: "X", price: 10, booking_request: { url: "javascript:alert(1)" } } }] };
    expect(parseBookingOptions(bad)).toEqual([]);
  });
});

describe("alloggi SerpApi", () => {
  const ctx = { destinationId: "barcellona", query: "hotel Barcellona Spagna", center: { lat: 41.3874, lng: 2.1686 }, checkIn: "2027-05-13", checkOut: "2027-05-17", guests: 2, fetchedAt: "2027-05-01T10:00:00.000Z" };
  const json = hotelsResponse({ q: ctx.query, checkIn: ctx.checkIn, checkOut: ctx.checkOut, adults: 2 });
  const offers = parseHotelResults(json, ctx);

  it("scarta le strutture senza prezzo preciso", () => {
    expect(offers.length).toBe(7); // 8 nel fixture, una senza prezzo
    expect(offers.every((o) => o.pricePerNight > 0 && o.priceTotal > 0)).toBe(true);
  });

  it("calcola notti, distanza dal centro e porta il voto a 0-10", () => {
    for (const o of offers) {
      expect(o.nights).toBe(4);
      expect(o.checkIn).toBe("2027-05-13");
      expect(o.distanceFromCenterKm).toBeLessThan(10);
      expect(o.rating).toBeGreaterThan(5);
      expect(o.rating).toBeLessThanOrEqual(10);
      expect(o.bookingRef?.params.property_token).toBeTruthy();
    }
  });

  it("gestisce le strutture senza foto e riconosce le tipologie", () => {
    const hostel = offers.find((o) => o.name.includes("Hostel"))!;
    expect(hostel.imageUrl).toBe("");
    expect(hostel.type).toBe("ostello");
    expect(offers.find((o) => o.name.includes("Apartment"))).toBeUndefined(); // è la struttura senza prezzo del fixture
    expect(stayTypeOf({ name: "Casa Mare", type: "vacation rental" })).toBe("appartamento");
    expect(stayTypeOf({ name: "B&B La Terrazza" })).toBe("bnb");
    expect(stayTypeOf({ name: "Hotel Marina Resort" })).toBe("resort");
  });

  it("normalizza i servizi (inglese e italiano) sulle etichette dei filtri", () => {
    expect(normalizeAmenities(["Free Wi-Fi", "Air-conditioned", "Piscina", "Kitchen", "Colazione gratuita", "Rooftop bar"])).toEqual(["Wi-Fi", "Aria condizionata", "Piscina", "Cucina", "Colazione", "Rooftop bar"]);
    expect(offers.some((o) => o.breakfastIncluded)).toBe(true);
  });

  it("scarta strutture senza coordinate e segnala il formato inatteso se non resta nulla", () => {
    const noGps = { properties: [{ name: "X", rate_per_night: { extracted_lowest: 50 } }] };
    expect(() => parseHotelResults(noGps, ctx)).toThrow(/formato inatteso/);
    expect(parseHotelResults({}, ctx)).toEqual([]);
  });

  it("elenca i venditori della struttura senza duplicati, dal più economico", () => {
    const ref = offers[0].bookingRef!;
    const sellers = parseHotelSellers(hotelSellersResponse({ token: ref.params.property_token, checkIn: ctx.checkIn, checkOut: ctx.checkOut }), ref, 4);
    expect(sellers.map((s) => s.seller)).toEqual(expect.arrayContaining(["Booking.com", "Expedia"]));
    expect(sellers.filter((s) => s.seller === "Booking.com")).toHaveLength(1);
    for (let i = 1; i < sellers.length; i++) expect(sellers[i].price!).toBeGreaterThanOrEqual(sellers[i - 1].price!);
  });

  it("senza venditori ripiega sulla pagina Google della struttura", () => {
    const ref = { provider: "serpapi", kind: "stay" as const, params: { link: "https://www.google.com/travel/hotels/entity/abc" } };
    expect(parseHotelSellers({}, ref, 3)).toEqual([expect.objectContaining({ seller: "Google Hotels", method: "GET" })]);
  });
});
