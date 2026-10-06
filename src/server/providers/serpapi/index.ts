import "server-only";
import { SerpApiClient } from "./client";
import { SerpApiFlightProvider } from "./flights";
import { SerpApiAccommodationProvider } from "./hotels";

/** Un solo client condiviso: stessa deduplica delle richieste in corso per voli e alloggi. */
export const serpApiClient = new SerpApiClient();

export const createSerpApiFlights = () => new SerpApiFlightProvider(serpApiClient);
export const createSerpApiAccommodations = () => new SerpApiAccommodationProvider(serpApiClient);
