import { describe, expect, it } from "vitest";
import { EMPTY_FLIGHT_FILTERS, EMPTY_STAY_FILTERS, filterFlights, filterStays, flightBadges, sortFlights, sortStays } from "./filters";
import type { AccommodationOffer, FlightOffer } from "./types";

const flight = (id: string, price: number, durationMin: number, stops: number, hour: string, airline = "Ryanair", checked = false): FlightOffer => ({
  id, provider: "test", airline, airlineCode: "FR", flightNumber: "FR1", fromCode: "NAP", toCode: "BCN", fromCity: "", toCity: "",
  departAt: `2027-05-10T${hour}`, arriveAt: `2027-05-10T${hour}`, durationMin, stops, stopCodes: stops ? ["FRA"] : [], price,
  baggage: { cabin: false, checked }, conditions: [], refundable: false,
});

const flights = [flight("a", 80, 120, 0, "07:00"), flight("b", 50, 300, 1, "14:00", "Lufthansa", true), flight("c", 120, 110, 0, "20:00", "Vueling")];

describe("filtri voli", () => {
  it("filtra per scali, fascia oraria e compagnia", () => {
    expect(filterFlights(flights, { ...EMPTY_FLIGHT_FILTERS, maxStops: 0 }).map((f) => f.id)).toEqual(["a", "c"]);
    expect(filterFlights(flights, { ...EMPTY_FLIGHT_FILTERS, slots: ["sera"] }).map((f) => f.id)).toEqual(["c"]);
    expect(filterFlights(flights, { ...EMPTY_FLIGHT_FILTERS, airlines: ["Lufthansa"] }).map((f) => f.id)).toEqual(["b"]);
    expect(filterFlights(flights, { ...EMPTY_FLIGHT_FILTERS, avoidStopAirports: ["FRA"] }).map((f) => f.id)).toEqual(["a", "c"]);
    expect(filterFlights(flights, { ...EMPTY_FLIGHT_FILTERS, checkedBag: true }).map((f) => f.id)).toEqual(["b"]);
  });

  it("ordina e assegna le etichette", () => {
    expect(sortFlights(flights, "prezzo").map((f) => f.id)).toEqual(["b", "a", "c"]);
    expect(sortFlights(flights, "durata")[0].id).toBe("c");
    const badges = flightBadges(flights);
    expect(badges.get("b")).toContain("Più economico");
    expect(badges.get("c")).toContain("Più veloce");
  });
});

describe("filtri alloggi", () => {
  const stay = (id: string, pricePerNight: number, rating: number, km: number, type: AccommodationOffer["type"], free = false): AccommodationOffer => ({
    id, provider: "t", name: id, type, neighborhood: "", location: { lat: 0, lng: 0 }, distanceFromCenterKm: km, rating, reviewsCount: 10,
    pricePerNight, priceTotal: pricePerNight * 3, nights: 3, checkIn: "2027-05-10", checkOut: "2027-05-13", amenities: ["Wi-Fi"], freeCancellation: free, breakfastIncluded: false, imageUrl: "", conditions: [],
  });
  const stays = [stay("h", 120, 9, 0.5, "hotel", true), stay("o", 30, 8, 2, "ostello"), stay("a", 90, 7, 5, "appartamento", true)];
  it("filtra per voto, distanza, tipo e cancellazione", () => {
    expect(filterStays(stays, { ...EMPTY_STAY_FILTERS, minRating: 8 }).map((s) => s.id)).toEqual(["h", "o"]);
    expect(filterStays(stays, { ...EMPTY_STAY_FILTERS, maxDistanceKm: 2 }).map((s) => s.id)).toEqual(["h", "o"]);
    expect(filterStays(stays, { ...EMPTY_STAY_FILTERS, types: ["appartamento"] }).map((s) => s.id)).toEqual(["a"]);
    expect(filterStays(stays, { ...EMPTY_STAY_FILTERS, freeCancellation: true }).map((s) => s.id)).toEqual(["h", "a"]);
  });
  it("ordina per voto", () => {
    expect(sortStays(stays, "voto")[0].id).toBe("h");
  });
});
