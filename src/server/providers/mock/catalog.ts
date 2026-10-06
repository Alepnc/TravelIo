/**
 * ⚠️ MOCK — destinazioni, POI e stime di spostamento basati sui dati demo in `server/mock-data`.
 */
import type { Destination, LatLng, PointOfInterest } from "@/lib/types";
import { estimateTravel } from "@/lib/geo";
import { DESTINATIONS } from "@/server/mock-data/destinations";
import { POIS } from "@/server/mock-data/pois";
import type { ActivityProvider, DestinationFilter, DestinationProvider, MapsProvider, TravelEstimate } from "../types";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export class MockDestinationProvider implements DestinationProvider {
  readonly name = "mock";
  readonly isMock = true;

  async list(filter: DestinationFilter = {}): Promise<Destination[]> {
    let list = DESTINATIONS;
    if (filter.category) list = list.filter((d) => d.categories.includes(filter.category!));
    if (filter.month) list = list.filter((d) => d.bestMonths.includes(filter.month!));
    if (filter.q) {
      const q = normalize(filter.q);
      list = list.filter((d) => normalize(`${d.name} ${d.country} ${d.airportCode}`).includes(q));
    }
    return list;
  }

  async get(id: string): Promise<Destination | null> {
    return DESTINATIONS.find((d) => d.id === id) ?? null;
  }

  async getByAirport(code: string): Promise<Destination | null> {
    return DESTINATIONS.find((d) => d.airportCode === code.toUpperCase()) ?? null;
  }
}

export class MockActivityProvider implements ActivityProvider {
  readonly name = "mock";
  readonly isMock = true;

  async listForDestination(destinationId: string): Promise<PointOfInterest[]> {
    return POIS.filter((p) => p.destinationId === destinationId);
  }

  async get(poiId: string): Promise<PointOfInterest | null> {
    return POIS.find((p) => p.id === poiId) ?? null;
  }
}

export class MockMapsProvider implements MapsProvider {
  readonly name = "stima-euristica";
  readonly isMock = true;

  estimate(a: LatLng, b: LatLng): TravelEstimate {
    return estimateTravel(a, b);
  }
}
