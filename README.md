# TravelIo

**Dall'idea all'itinerario, in un'unica app.** TravelIo accompagna chi viaggia con budget limitato lungo tutto il percorso:
ispirazione → ricerca → confronto di voli e alloggi → salvataggio → itinerario su mappa → modifica → budget.

> **Prezzi reali di voli e alloggi.** L'app legge Google Flights e Google Hotels tramite [SerpApi](https://serpapi.com),
> mostra prezzi precisi e rimanda ai siti dei venditori (compagnie aeree, Booking.com, Expedia…) per prenotare.
> Serve una chiave SerpApi: senza, l'app lo dice chiaramente e **non mostra dati finti** (vedi [Dati reali](#dati-reali)).
> Destinazioni, descrizioni e attività sono un catalogo curato incluso nel progetto, non prezzi di mercato.

Analisi di prodotto, user journey, schema dati, API, rischi e roadmap: **[docs/ARCHITETTURA.md](docs/ARCHITETTURA.md)**.

## Funzionalità

| Area | Cosa c'è |
|---|---|
| Ricerca | Ricerca precisa (A → B, date, viaggiatori, budget) e flessibile ("da Napoli, ovunque, ad agosto, 500 €") |
| Scoperta | Ispirazione per categoria e mese, pagina Prezzi (mete più economiche), pagine destinazione con itinerario consigliato |
| Voli e alloggi | Prezzi reali con "Vedi offerte" (elenco dei venditori e rimando al loro sito) e "Prenota" anche dal viaggio salvato. Risultati con filtri (prezzo, durata, scali, orario, compagnia, scalo, bagaglio / prezzo, voto, posizione, tipo, servizi, cancellazione) e ordinamenti, incluso "miglior rapporto qualità/prezzo" |
| Bozza senza account | Le selezioni restano nel browser; il login serve solo per salvare |
| Viaggi | Creazione, modifica, duplica, elimina, stati (Pianificazione, Confermato, In corso, Completato), partecipanti |
| Itinerario | Generazione automatica (voli, check-in/out, orari di apertura, distanze, ritmo, budget, interessi), drag & drop anche tra giorni, modifica, aggiunta, rigenera singola giornata. Le modifiche manuali non vengono sovrascritte |
| Mappa | Leaflet + sfondo OpenStreetMap (nessuna chiave; configurabile con `NEXT_PUBLIC_MAP_TILE_URL`), tappe numerate nell'ordine del giorno, sincronizzata con la lista, vista "tutti i giorni" |
| Budget | Previsto/effettivo, per persona, media giornaliera, avviso di sforamento, registro spese |
| Travel Optimizer | Date più convenienti, volo o alloggio più economico vicino, attività da spostare per ridurre gli spostamenti; si applica con un clic |
| Assistente AI | Contestuale al viaggio e al giorno aperto; propone operazioni tipizzate che l'utente approva. Claude se `ANTHROPIC_API_KEY` è impostata, altrimenti motore a regole (demo) |

## Avvio

Requisiti: Node.js ≥ 20.9.

```bash
npm install
npm run setup:env            # crea .env.local da .env.example (serve per la chiave SerpApi)
npm run dev                  # http://localhost:3000
```

Il database SQLite viene creato in `data/` e migrato automaticamente al primo avvio.

| Comando | |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build && npm start` | build e avvio di produzione |
| `npm test` | test (itinerario, budget, filtri, optimizer, assistente, parsing SerpApi, cache e quota) |
| `npm run check:providers -- --yes` | verifica l'integrazione SerpApi con la tua chiave (4 ricerche) |
| `npm run fake:serpapi` | server locale che imita il formato SerpApi, per provare senza quota |
| `npm run typecheck` / `npm run lint` | controlli statici |
| `npm run db:generate` | genera una nuova migrazione dopo aver modificato `src/server/db/schema.ts` |

Variabili utili (`.env.example`): `MOCK_LATENCY_MS` e `MOCK_FAILURE_RATE` simulano latenza ed errori dei servizi
per verificare skeleton ed error state; `ANTHROPIC_API_KEY` attiva l'assistente Claude.

## Dati reali

Voli e alloggi arrivano da **SerpApi** (Google Flights e Google Hotels). Per attivarli:

```bash
# 1. crea un account su https://serpapi.com e copia la chiave API
# 2. crea il file .env.local (copia di .env.example, se non esiste già)
npm run setup:env
# 3. apri .env.local con un editor di testo e scrivi la chiave dopo "SERPAPI_API_KEY="
#    (il nome inizia con un punto: è un file nascosto, non lo vedi in Finder/Esplora risorse)
# 4. verifica l'integrazione con la tua chiave (usa 4 ricerche del piano)
npm run check:providers -- --yes
npm run dev
```

Il controllo `check:providers` confronta la forma delle risposte reali con quella che l'adattatore si aspetta
(`src/server/providers/serpapi/parse-*.ts`) e, se qualcosa non torna, stampa i campi realmente ricevuti.

**Quanto costa in ricerche** (il piano gratuito ne include 250 al mese):

| Azione | Ricerche |
|---|---|
| Cercare un viaggio (voli andata + ritorno + alloggi) | 3 |
| "Vedi offerte" / "Prenota" su un volo o un alloggio | 1 |
| Ricerca flessibile ("ovunque") | fino a 6 (12 con "Controlla altre mete") |
| Pagine Ispirazione e Prezzi | fino a 3 per mese/aeroporto (poi dalla cache) |
| Optimizer: "Cerca risparmi su voli e alloggi" | fino a 9, solo su richiesta |
| Home, pagine destinazione, crawler | 0 (solo cache) |

Come si risparmia quota: cache persistente su database (voli 3 h, alloggi 6 h, link di prenotazione 1 h, prezzi
indicativi 24 h), richieste identiche in corso unite in una, contatore mensile (`SERPAPI_MONTHLY_LIMIT`) con il 30%
riservato alle ricerche dirette, limiti per IP sulle API pubbliche. Tutti i valori si regolano in `.env.example`.

**Cosa è reale e cosa no**
- Reali: prezzo dei voli (per persona), prezzo e foto degli alloggi, voti, link ai venditori. Ogni risultato mostra
  l'ora di rilevazione; il prezzo finale è sempre quello del sito del venditore.
- Nelle pagine di scoperta il **volo** è reale, mentre **alloggio e spese giornaliere sono stime di catalogo** e sono
  etichettate come tali ("stime").
- I bagagli non sono nei risultati di ricerca: la UI scrive "verifica sul sito del venditore" invece di inventarli.
- I voli si cercano come sole andate (andata e ritorno separati) con 1 adulto: il prezzo è così "per persona" e la
  stessa ricerca vale per qualsiasi numero di viaggiatori. Le tariffe A/R combinate di alcune compagnie possono costare meno.
- Il prezzo di un alloggio è quello che Google indica per date e ospiti cercati; con più camere il totale può differire.

**Provare senza chiave né quota.** `npm run fake:serpapi` avvia un server locale che imita il *formato* delle risposte
(prezzi inventati); poi `SERPAPI_BASE_URL=http://localhost:4010 SERPAPI_API_KEY=prova npm run dev`. È uno strumento di
sviluppo e di test, non un provider: l'app senza chiave non usa mai dati finti.
Per usare i dati dimostrativi integrati: `FLIGHT_PROVIDER=mock ACCOMMODATION_PROVIDER=mock`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Drizzle ORM + SQLite (better-sqlite3) · zod ·
@dnd-kit · Leaflet/react-leaflet · Anthropic SDK · sonner · vitest.

## Struttura

```
src/
├── app/                 pagine, layout, route handler (/api) e server action
├── components/          UI per dominio: ui, layout, search, flights, stays, trips, itinerary, map, budget, optimizer, assistant
├── lib/                 codice puro condiviso client/server: tipi, validazione, date, geo,
│                        generatore e ricalcolo itinerario, budget, filtri
└── server/
    ├── db/              schema e client Drizzle (migrazioni in /drizzle)
    ├── auth/            password (scrypt) e sessioni
    ├── providers/       interfacce + registry + implementazioni mock
    ├── mock-data/       catalogo demo: destinazioni, POI, aeroporti
    ├── services/        logica applicativa (viaggi, itinerario, optimizer, assistente, …)
    └── security/        rate limiting
```

## Provider

Ogni servizio esterno è un'interfaccia in `src/server/providers/types.ts`: `FlightProvider`, `AccommodationProvider`,
`DestinationProvider`, `ActivityProvider`, `MapsProvider` (+ `MailProvider`). Voli e alloggi hanno oggi due
implementazioni: `serpapi` (default, in `src/server/providers/serpapi/`) e `mock` (dati dimostrativi, opt-in).

Per aggiungere un altro fornitore (Duffel, Kiwi, Booking…): implementa l'interfaccia in `src/server/providers/<nome>/`,
registrala in `src/server/providers/index.ts` e seleziona con `FLIGHT_PROVIDER=<nome>`. Il contratto include
`getOffer(id)` e `getBookingOptions(ref)`: le offerte salvate in un viaggio vengono sempre rilette dal provider
tramite il loro id (il prezzo non arriva mai dal client) e i link di prenotazione si ottengono dal server.

## Sicurezza

- Password con scrypt e salt; sessioni casuali salvate come hash SHA-256; cookie `httpOnly`, `SameSite=Lax`, `Secure` in produzione.
- Ogni accesso a viaggi, giornate e attività verifica la proprietà (404 se non è dell'utente).
- Validazione zod su form, API e output dell'AI; l'assistente propone, non scrive mai direttamente.
- Mutazioni JSON accettate solo dalla stessa origine; server action protette da Next.js.
- Rate limiting su login, registrazione, recupero password, generazione itinerario e assistente.
- Nessun segreto nel codice: solo variabili d'ambiente. Header di sicurezza in `next.config.ts`.

## Limiti noti e prossimi passi

- **Prenotazione**: TravelIo non vende né incassa: rimanda al sito del venditore. Nessuna commissione né link affiliato
  (SerpApi non li prevede); il modello di ricavo, se serve, è da definire.
- **Formato SerpApi**: l'adattatore è scritto sul formato documentato ma va confermato con la tua chiave
  (`npm run check:providers`); se SerpApi cambia i campi, il parsing segnala "formato inatteso" invece di mostrare liste vuote.
- **Link di prenotazione**: Google restituisce per i voli una richiesta POST verso il venditore; l'app la invia con un form
  in una nuova scheda. I riferimenti salvati nei viaggi possono scadere: in quel caso va ripetuta la ricerca.
- **Sfondo della mappa**: di default OpenStreetMap, che non richiede chiavi ma ammette solo un uso leggero
  ([policy](https://operations.osmfoundation.org/policies/tiles/)). Con più traffico usa un fornitore di tile
  (MapTiler, Stadia Maps…) impostando `NEXT_PUBLIC_MAP_TILE_URL` e `NEXT_PUBLIC_MAP_ATTRIBUTION` in `.env.local`.
  Se lo sfondo non carica, la mappa lo segnala e mostra comunque i punti dell'itinerario.
- **Foto degli alloggi**: provengono dagli host di Google e si caricano con `<img>` (non `next/image`, perché gli host variano).
- **Attività e destinazioni**: catalogo curato di 20 mete con poche decine di punti di interesse; un `ActivityProvider`
  reale (Google Places, OpenTripMap) è il prossimo passo naturale.
- **Rate limit e cache di breve durata in memoria**: validi per una singola istanza; in produzione usare Redis
  (la cache dei provider e la quota sono già su database).
- **SQLite** in sviluppo; per la produzione passare a PostgreSQL (dialetto `pg-core` di Drizzle).
- **Rendering dinamico ovunque**: la navbar legge il cookie di sessione nel layout radice. Con `cacheComponents` (PPR)
  le pagine pubbliche, come quelle delle destinazioni, potrebbero diventare statiche.
- **Email**: il recupero password stampa il link nei log del server finché non si collega un `MailProvider`.
- Futuro: viaggi condivisi e collaborativi, divisione spese, notifiche di prezzo, export calendario/PDF, PWA offline, i18n.
