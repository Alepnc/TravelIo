/**
 * Registro dei provider. L'implementazione si sceglie da variabili d'ambiente
 * (FLIGHT_PROVIDER, ACCOMMODATION_PROVIDER, …).
 *
 *  - Voli e alloggi: "serpapi" (dati reali di Google Flights/Hotels, default) oppure "mock" (dati dimostrativi,
 *    solo se richiesto esplicitamente).
 *  - Destinazioni e attività: catalogo curato incluso nel progetto ("mock" = nessuna API esterna).
 *
 * Per aggiungere un provider: implementare l'interfaccia in `./<nome>/` e aggiungere un case qui.
 * Nessun altro file dell'app deve cambiare.
 */
import "server-only";
import { MockAccommodationProvider } from "./mock/accommodations";
import { MockActivityProvider, MockDestinationProvider, MockMapsProvider } from "./mock/catalog";
import { MockFlightProvider } from "./mock/flights";
import { createSerpApiAccommodations, createSerpApiFlights } from "./serpapi";
import type {
  AccommodationProvider,
  ActivityProvider,
  DestinationProvider,
  FlightProvider,
  MapsProvider,
} from "./types";

function choose<T>(kind: string, envVar: string | undefined, factories: Record<string, () => T>, fallback = "mock"): T {
  const key = envVar || fallback;
  const factory = factories[key];
  if (!factory) throw new Error(`Provider ${kind} "${key}" non configurato. Disponibili: ${Object.keys(factories).join(", ")}`);
  return factory();
}

export const flights: FlightProvider = choose<FlightProvider>(
  "voli",
  process.env.FLIGHT_PROVIDER,
  { serpapi: createSerpApiFlights, mock: () => new MockFlightProvider() },
  "serpapi",
);
export const accommodations: AccommodationProvider = choose<AccommodationProvider>(
  "alloggi",
  process.env.ACCOMMODATION_PROVIDER,
  { serpapi: createSerpApiAccommodations, mock: () => new MockAccommodationProvider() },
  "serpapi",
);
export const destinations: DestinationProvider = choose("destinazioni", process.env.DESTINATION_PROVIDER, {
  mock: () => new MockDestinationProvider(),
});
export const activities: ActivityProvider = choose("attività", process.env.ACTIVITY_PROVIDER, {
  mock: () => new MockActivityProvider(),
});
export const maps: MapsProvider = choose("mappe", process.env.MAPS_PROVIDER, { mock: () => new MockMapsProvider() });

/**
 * true se prezzi di voli o alloggi sono dimostrativi: la UI mostra il badge "Dati dimostrativi".
 * Destinazioni e attività sono un catalogo curato (non prezzi di mercato) e non lo attivano.
 */
export const usingMockData = flights.isMock || accommodations.isMock;
