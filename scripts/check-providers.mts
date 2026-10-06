/**
 * Verifica l'integrazione con SerpApi usando la TUA chiave: esegue 4 ricerche reali (1 voli, 1 link di
 * prenotazione voli, 1 alloggi, 1 venditori alloggio) e confronta la forma delle risposte con quella
 * attesa dall'adattatore. Se qualcosa non torna, stampa i campi realmente ricevuti.
 *
 *   npm run check:providers -- --yes
 */
import { serpApiClient } from "../src/server/providers/serpapi";
import { usageThisMonth } from "../src/server/providers/serpapi/usage";
import { createSerpApiAccommodations, createSerpApiFlights } from "../src/server/providers/serpapi";
import { itineraryList } from "../src/server/providers/serpapi/parse-flights";
import { addDays, todayISO } from "../src/lib/time";

const ok = (m: string) => console.log(`  ✓ ${m}`);
const ko = (m: string) => {
  console.log(`  ✗ ${m}`);
  failures++;
};
let failures = 0;
const check = (cond: boolean, good: string, bad: string) => (cond ? ok(good) : ko(bad));

if (!process.argv.includes("--yes")) {
  console.log("Questo controllo esegue 4 ricerche reali su SerpApi (4 delle tue ricerche mensili).\nRilancialo con:  npm run check:providers -- --yes");
  process.exit(0);
}
if (!serpApiClient.isConfigured()) {
  console.error("SERPAPI_API_KEY non impostata. Mettila in .env.local (vedi .env.example).");
  process.exit(1);
}

const depart = addDays(todayISO(), 45);
const checkOut = addDays(depart, 4);
const flights = createSerpApiFlights();
const stays = createSerpApiAccommodations();
const before = usageThisMonth();
console.log(`Quota prima: ${before.used}/${before.limit}. Date di prova: ${depart} → ${checkOut}\n`);

try {
  console.log("1) Voli NAP → BCN (sola andata)");
  const offers = await flights.search({ from: "NAP", to: "BCN", date: depart, travelers: 1 });
  // Risposta grezza dalla cache della stessa ricerca (nessuna ricerca in più)
  const raw = serpApiClient.peek(`serpapi:fl:ow:NAP:BCN:${depart}`);
  const sample = raw && itineraryList(raw.json)[0];
  console.log(`  chiavi di primo livello: ${raw ? Object.keys(raw.json).join(", ") : "-"}`);
  console.log(`  campi del primo itinerario: ${sample ? Object.keys(sample as object).join(", ") : "(nessuno)"}`);
  check(offers.length > 0, `${offers.length} offerte interpretate; la più economica: ${Math.min(...offers.map((o) => o.price))} € (${offers[0].airline}, ${offers[0].departAt})`, "nessuna offerta interpretata");
  const withToken = offers.filter((o) => o.bookingRef);
  check(withToken.length > 0, `${withToken.length}/${offers.length} offerte hanno un booking_token`, "nessun booking_token: i link di prenotazione non saranno disponibili");

  console.log("\n2) Link di prenotazione del primo volo");
  if (withToken[0]) {
    const options = await flights.getBookingOptions(withToken[0].bookingRef!);
    check(options.length > 0, `${options.length} venditori: ${options.slice(0, 4).map((o) => `${o.seller} ${o.price ?? "?"}€ [${o.method}]`).join(", ")}`, "nessun venditore interpretato (controlla booking_options nella risposta)");
  } else ko("saltato (nessun booking_token)");

  console.log("\n3) Alloggi a Barcellona");
  const hotels = await stays.search({ destinationId: "barcellona", checkIn: depart, checkOut, guests: 2 });
  check(hotels.length > 0, `${hotels.length} strutture; la più economica: ${Math.min(...hotels.map((h) => h.pricePerNight))} €/notte`, "nessuna struttura interpretata");
  if (hotels.length) {
    const sample = hotels[0];
    console.log(`  esempio: ${sample.name} · ${sample.type} · voto ${sample.rating} · ${sample.distanceFromCenterKm} km dal centro · foto: ${sample.imageUrl ? "sì" : "no"}`);
    console.log(`  host delle foto: ${[...new Set(hotels.map((h) => (h.imageUrl ? new URL(h.imageUrl).hostname : "")).filter(Boolean))].join(", ") || "-"}`);
  }

  console.log("\n4) Venditori della prima struttura");
  const ref = hotels.find((h) => h.bookingRef)?.bookingRef;
  if (ref) {
    const sellers = await stays.getBookingOptions(ref);
    check(sellers.length > 0, `${sellers.length} venditori: ${sellers.slice(0, 4).map((s) => `${s.seller} ${s.price ?? "?"}€`).join(", ")}`, "nessun venditore interpretato (controlla featured_prices/prices)");
  } else ko("saltato (nessun riferimento di prenotazione)");
} catch (e) {
  ko(`errore: ${e instanceof Error ? e.message : e}`);
}

const after = usageThisMonth();
console.log(`\nQuota dopo: ${after.used}/${after.limit} (${after.used - before.used} ricerche usate)`);
console.log(failures ? `\n${failures} controllo/i falliti: incolla l'output a Claude per adattare il parsing.` : "\nTutto coerente con le attese.");
process.exit(failures ? 1 : 0);
