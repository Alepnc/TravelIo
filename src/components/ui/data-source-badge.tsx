import { flights, usingMockData } from "@/server/providers";
import { serpApiClient } from "@/server/providers/serpapi";
import { DemoDataBadge, LiveDataBadge } from "./misc";

/**
 * Dice all'utente da dove vengono i prezzi: dati reali (Google) oppure dimostrativi.
 * Se il provider reale non è configurato (manca la chiave) non afferma nulla: i risultati mostreranno l'errore.
 * Solo componenti server.
 */
export function DataSourceBadge({ className }: { className?: string }) {
  if (usingMockData) return <DemoDataBadge className={className} />;
  if (flights.name === "serpapi" && !serpApiClient.isConfigured()) return null;
  return <LiveDataBadge className={className} />;
}
