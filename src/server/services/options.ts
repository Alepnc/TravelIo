import "server-only";
import { destinations, flights } from "@/server/providers";
import { getCurrentUser } from "@/server/auth/session";

/** Opzioni per il search widget + aeroporto di partenza preferito dell'utente. */
export async function getSearchOptions() {
  const [origins, dests, user] = await Promise.all([flights.listOriginAirports(), destinations.list(), getCurrentUser()]);
  return {
    origins: origins.map((a) => ({ value: a.code, label: a.code === "BGY" || a.code === "CIA" || a.code === "LIN" ? `${a.name} (${a.code})` : `${a.city} (${a.code})` })),
    destinations: [...dests].sort((a, b) => a.name.localeCompare(b.name)).map((d) => ({ value: d.id, label: `${d.name}, ${d.country}` })),
    homeAirport: user?.homeAirport ?? "NAP",
  };
}
