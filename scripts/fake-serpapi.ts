/**
 * Server di PROVA che imita il formato delle risposte di SerpApi (voli, alloggi, link di prenotazione).
 * Serve per provare l'integrazione senza chiave e senza consumare quota. NON è un provider dell'app:
 * i prezzi sono inventati. Uso:
 *
 *   npm run fake:serpapi                      # in un terminale
 *   SERPAPI_BASE_URL=http://localhost:4010 SERPAPI_API_KEY=prova npm run dev
 *
 * Casi speciali: aeroporto KEF → "nessun risultato"; chiave "bad" → 401; GET /__stats → ricerche ricevute.
 */
import http from "node:http";
import { flightBookingResponse, flightsResponse, hotelSellersResponse, hotelsResponse } from "./serpapi-fixtures";

const PORT = Number(process.env.FAKE_SERPAPI_PORT ?? 4010);
const stats: Record<string, number> = {};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === "/__stats") return send(200, stats);
  if (url.pathname !== "/search.json") return send(404, { error: "not found" });

  const p = url.searchParams;
  if (p.get("api_key") === "bad") return send(401, { error: "Invalid API key." });
  if (!p.get("api_key")) return send(401, { error: "Missing API key." });

  const engine = p.get("engine") ?? "";
  const kind = engine === "google_flights" ? (p.get("booking_token") ? "flights:booking" : p.get("type") === "1" ? "flights:roundtrip" : "flights:oneway") : p.get("property_token") ? "hotels:sellers" : "hotels:search";
  stats[kind] = (stats[kind] ?? 0) + 1;
  console.log(`[fake-serpapi] ${kind} ${[...p.entries()].filter(([k]) => k !== "api_key").map(([k, v]) => `${k}=${v.slice(0, 24)}`).join(" ")}`);

  setTimeout(() => {
    if (engine === "google_flights") {
      const dep = p.get("departure_id") ?? "";
      const arr = p.get("arrival_id") ?? "";
      if (arr === "KEF" || dep === "KEF") return send(200, { error: "Google Flights hasn't returned any results for this query." });
      if (p.get("booking_token")) return send(200, flightBookingResponse(p.get("booking_token")!));
      return send(200, flightsResponse({ dep, arr, date: p.get("outbound_date") ?? "", roundTrip: p.get("type") === "1" }));
    }
    if (engine === "google_hotels") {
      const base = { checkIn: p.get("check_in_date") ?? "", checkOut: p.get("check_out_date") ?? "" };
      if (p.get("property_token")) return send(200, hotelSellersResponse({ token: p.get("property_token")!, ...base }));
      return send(200, hotelsResponse({ q: p.get("q") ?? "", adults: Number(p.get("adults") ?? 2), ...base }));
    }
    send(400, { error: `Unsupported engine: ${engine}` });
  }, 150);
});

server.listen(PORT, () => console.log(`[fake-serpapi] in ascolto su http://localhost:${PORT}`));
