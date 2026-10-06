import { flights, usingMockData } from "@/server/providers";
import { serpApiClient } from "@/server/providers/serpapi";
import { DemoDataBadge, LiveDataBadge } from "./misc";

/**
 * Dice all'utente da dove vengono i prezzi: dati reali (Google) oppure dimostrativi.
 * Se il provider reale non è configurato (manca la chiave) non afferma nulla: i risultati mostreranno l'errore.
 * Solo componenti server.
 */
export function DataSourceBadge({ className, onBoard, live = true }: { className?: string; onBoard?: boolean; /** false quando a schermo non c'è nessun prezzo rilevato: il badge non deve promettere dati reali */ live?: boolean }) {
  if (usingMockData) return <DemoDataBadge className={className} />;
  if (!live) return null;
  if (flights.name === "serpapi" && !serpApiClient.isConfigured()) return null;
  return <LiveDataBadge className={className} onBoard={onBoard} />;
}
