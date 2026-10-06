# TravelIo — Analisi di prodotto e architettura

> Documento di riferimento per lo sviluppo. Risponde alla domanda guida:
> **"Come posso organizzare il mio viaggio nel modo più semplice, economico e intelligente possibile?"**

---

## 1. Product overview

TravelIo è un **travel assistant unico**: l'utente parte da un'idea vaga ("voglio andare al mare ad agosto con 500 €")
e arriva a un viaggio completo (voli, alloggio, itinerario giorno per giorno su mappa, budget), senza saltare tra
dieci siti diversi.

Tre principi di prodotto:

1. **Un solo oggetto centrale: il Viaggio.** Ricerca, confronto, itinerario, budget e assistente AI leggono e
   scrivono tutti sullo stesso `Trip`. Non esistono "strumenti separati".
2. **Decisioni, non solo risultati.** Ogni lista ha un ordinamento "miglior rapporto qualità/prezzo", e il
   *Travel Optimizer* produce suggerimenti azionabili con un clic ("Partendo un giorno prima risparmi 84 €").
3. **L'utente comanda.** Le modifiche manuali all'itinerario non vengono mai sovrascritte dalla generazione
   automatica; l'assistente AI *propone* modifiche, l'utente le applica.

Target: giovani, studenti, gruppi, coppie, viaggiatori indipendenti con budget limitato. Tono visivo giovane,
minimale, mobile-first, lontano dai portali di prenotazione tradizionali.

## 2. User journey

```
Ispirazione ──► Ricerca ──► Confronto ──► Organizzazione ──► Salvataggio ──► Itinerario ──► Modifica ──► Viaggio
  /ispirazione    /cerca      voli/alloggi   bozza viaggio     /viaggi/nuovo    genera        DnD, AI,     stato
  /destinazioni   (flessibile  filtri,       (barra "Il tuo    (login solo      /viaggi/:id/  optimizer    "In corso"
  home            o precisa)   ordinamenti   viaggio")         qui)             itinerario
```

| Fase | Cosa fa l'utente | Cosa fa il sistema |
|---|---|---|
| Ispirazione | Sfoglia categorie (Mare, Nightlife, Sotto 300 €…) | Mostra mete con prezzo indicativo calcolato dal suo aeroporto |
| Ricerca | Compila "Da dove parti / Dove vuoi andare / Quando / Viaggiatori / Budget", può lasciare campi vuoti | Ricerca precisa → voli+alloggi; ricerca flessibile → mete compatibili con periodo e budget |
| Confronto | Filtra, ordina, seleziona volo andata/ritorno e alloggio | Aggiorna in tempo reale il totale della bozza e lo confronta con il budget |
| Organizzazione | Vede la barra "Il tuo viaggio" con le selezioni | La bozza vive nel browser: si esplora **senza account** |
| Salvataggio | "Crea viaggio" | Richiede login solo ora; la bozza sopravvive al login e precompila il form |
| Itinerario | "Genera itinerario" | Algoritmo che rispetta voli, check-in, orari di apertura, distanze, ritmo e budget |
| Modifica | Trascina, sposta di giorno, modifica, elimina, rigenera un giorno, chiede all'AI | Ricalcola orari e spostamenti, aggiorna la mappa, non tocca le giornate modificate a mano |
| Viaggio | Torna al viaggio, controlla budget e spese | Stati Pianificazione → Confermato → In corso → Completato |

## 3. Information architecture

```
TravelIo
├── Esplora (/cerca)                 ricerca unificata
│   ├── Mete suggerite               (ricerca flessibile)
│   ├── Voli                         andata / ritorno, filtri, ordinamenti
│   └── Alloggi                      filtri, ordinamenti
├── Ispirazione (/ispirazione)       categorie → card destinazione
│   └── Destinazione (/destinazioni/[slug])
├── Prezzi (/prezzi)                 mete più economiche per mese dal tuo aeroporto
├── I miei viaggi (/viaggi)          dashboard (auth)
│   ├── Nuovo viaggio (/viaggi/nuovo)
│   └── Viaggio (/viaggi/[id])
│       ├── Panoramica               riepilogo, voli, alloggio, suggerimenti optimizer
│       ├── Itinerario               builder + mappa + assistente AI
│       └── Budget                   tracker previsto/effettivo, spese
└── Account
    ├── Accedi / Registrati
    ├── Password dimenticata / Reset
    └── Profilo e preferenze
```

> Nota di prodotto: la voce di menu **"Prezzi"** è interpretata come *esploratore di prezzi* (calendario delle mete
> più economiche) e non come listino di un abbonamento: il prodotto non ha piani a pagamento nell'MVP.

## 4. Lista completa delle pagine

| Route | Tipo | Auth | Descrizione |
|---|---|---|---|
| `/` | Server | no | Home: hero + search widget, destinazioni popolari, "Trova il viaggio perfetto", categorie, come funziona, funzionalità, CTA, footer |
| `/cerca` | Server + client | no | Risultati: mete (flessibile) oppure voli + alloggi (precisa) |
| `/ispirazione` | Server | no | Scoperta per categorie |
| `/destinazioni/[slug]` | Server (SSG) | no | Pagina destinazione: perché visitarla, quando andare, prezzi, voli, alloggi, attrazioni, itinerari consigliati |
| `/prezzi` | Server | no | Mete più economiche per mese |
| `/accedi`, `/registrati` | Server + form | no | Autenticazione |
| `/password-dimenticata`, `/reset-password` | Server + form | no | Recupero password |
| `/profilo` | Server | sì | Dati utente e preferenze di viaggio |
| `/viaggi` | Server | sì | Dashboard "I miei viaggi" |
| `/viaggi/nuovo` | Server + form | sì | Creazione viaggio (precompilata da ricerca/bozza) |
| `/viaggi/[id]` | Server | sì | Panoramica viaggio |
| `/viaggi/[id]/itinerario` | Client-heavy | sì | Itinerary builder + mappa + assistente |
| `/viaggi/[id]/budget` | Server + client | sì | Budget tracker |
| `not-found`, `error` | — | — | Stati di errore globali |

## 5. Componenti principali

```
ui/            Button, Input, Select, Badge, Card, Skeleton, EmptyState, ErrorState, Sheet, Tabs,
               Dialog (solo dove serve), Stepper, PriceTag, Avatar, ProgressBar, CoverImage
layout/        Navbar (guest/auth), MobileNav (tab bar), Footer, Container, PageHeader
search/        SearchWidget (hero/compatta), FieldPopover, TravelersPicker, SearchSummary
discovery/     DestinationCard, CategoryChips, DestinationGrid, InspirationRail
flights/       FlightCard, FlightFilters, FlightSort, FlightResults
stays/         StayCard, StayFilters, StayResults
draft/         DraftTripBar (bozza viaggio sticky), DraftProvider
trips/         TripCard, TripStatusBadge, TripForm, TripHeader, TripTabs, TripActions
itinerary/     ItineraryBuilder, DayColumn, DaySelector, ActivityCard (sortable), ActivityEditor (sheet),
               AddActivitySheet, TravelSegment, GenerateItineraryButton
map/           TripMap (Leaflet, caricata lazy), NumberedMarker, RouteLine
budget/        BudgetSummary, CategoryBreakdown, BudgetBar, ExpenseList, ExpenseForm
optimizer/     SuggestionCard, SuggestionList
assistant/     AssistantPanel, ProposalCard, PromptChips
```

## 6. Database schema

Database relazionale PostgreSQL (PGlite in sviluppo, Neon o altro Postgres in produzione, vedi §8). ORM: Drizzle.

```
users ─┬─< sessions
       ├─< password_reset_tokens
       ├── preferences (1:1)
       └─< trips ─┬─< travelers
                  ├─< trip_flights          (offerte volo scelte: andata/ritorno)
                  ├─< trip_accommodations   (alloggio scelto)
                  ├── itineraries (1:1) ──< itinerary_days ──< activities
                  ├─< bookings              (stato prenotazione di voli/alloggi/attività)
                  └─< expenses              (spese effettive / extra)
```

| Entità | Campi principali | Note |
|---|---|---|
| **User** | id, email (unique), name, passwordHash, homeAirport, createdAt | password con scrypt + salt |
| Session | id (hash del token), userId, expiresAt | cookie httpOnly, il DB salva solo l'hash |
| PasswordResetToken | id, userId, tokenHash, expiresAt, usedAt | monouso, 30 min |
| **Preference** | userId (PK), pace (relaxed/balanced/intense), interests[], budgetLevel | influenza l'itinerario |
| **Trip** | id, userId, name, destinationId, snapshot destinazione (nome, paese, lat/lng, immagine), originCode, startDate, endDate, travelersCount, budgetPerPerson, status, timestamps | lo snapshot evita join verso provider esterni |
| **Traveler** | id, tripId, name, email?, isOwner | partecipanti |
| **Destination** | id/slug, nome, paese, IATA, coordinate, tag, mesi ideali, clima, prezzi medi | **di proprietà del DestinationProvider** (catalogo), non della tabella utente |
| **Flight** (`trip_flights`) | id, tripId, direction, provider, offerId, airline, flightNumber, from/to, departAt, arriveAt, duration, stops, price, baggage, conditions | snapshot dell'offerta scelta |
| **Accommodation** (`trip_accommodations`) | id, tripId, provider, offerId, name, type, lat/lng, rating, reviews, pricePerNight, priceTotal, freeCancellation, image | |
| **Itinerary** | id, tripId (unique), pace, generatedAt | |
| **ItineraryDay** | id, itineraryId, dayIndex, date, title, isUserModified | giornate toccate a mano non vengono rigenerate |
| **Activity** | id, dayId, position, title, category, startTime, durationMin, placeName, lat/lng, cost, notes, poiId, source (generated/user/assistant), isUserModified, timeLocked | |
| **Booking** | id, tripId, kind, refId, status, providerRef, amount | predisposto per il checkout reale |
| **Expense** | id, tripId, category, label, amount, spentAt | budget *effettivo* |

## 7. API architecture

Tre strati, dipendenze solo verso il basso:

```
app/ (pagine, route handlers, server actions)      ← HTTP, validazione zod, auth, rate limit
  └── server/services/  (trips, itinerary, budget, optimizer, assistant, auth)   ← logica applicativa
        ├── server/db/  (Drizzle)                   ← persistenza
        └── server/providers/  (interfacce + adapter)
              ├── FlightProvider          mock | (Amadeus, Duffel, Kiwi…)
              ├── AccommodationProvider   mock | (Booking Affiliate, Hotelbeds…)
              ├── DestinationProvider     mock catalogo curato | (CMS / DB)
              ├── ActivityProvider        mock POI curati | (Google Places, Foursquare, OpenTripMap…)
              ├── MapsProvider            haversine + stime | (OSRM, Mapbox, Google Routes)
              └── AssistantProvider       rule-based (demo) | Claude (se ANTHROPIC_API_KEY)
```

Il registro `server/providers/index.ts` sceglie l'implementazione da variabili d'ambiente: cambiare provider non
richiede di toccare UI o servizi. I mock sono in `server/providers/mock/` e i dati demo in `server/mock-data/`;
la UI mostra un badge **"Dati dimostrativi"** finché è attivo un provider mock.

Endpoint REST (route handlers, JSON, validati con zod):

| Metodo | Endpoint | Scopo |
|---|---|---|
| GET | `/api/destinations?category&month&maxPrice&q` | catalogo/ricerca mete |
| GET | `/api/destinations/suggest?from&month&budget&travelers` | ricerca flessibile |
| GET | `/api/flights?from&to&date&travelers` | offerte volo (una tratta) |
| GET | `/api/accommodations?destination&checkIn&checkOut&guests` | offerte alloggio |
| POST | `/api/trips/:id/flights`, `/api/trips/:id/accommodation` | aggiungi selezione al viaggio |
| POST | `/api/trips/:id/itinerary` | genera (rispetta giornate modificate) |
| POST | `/api/trips/:id/itinerary/days/:dayId/regenerate` | rigenera una giornata |
| PUT | `/api/trips/:id/itinerary/order` | riordino / spostamento tra giorni (DnD) |
| POST/PATCH/DELETE | `/api/trips/:id/activities[/:activityId]` | CRUD attività |
| GET | `/api/trips/:id/suggestions` | Travel Optimizer |
| POST | `/api/trips/:id/suggestions/apply` | applica un suggerimento |
| POST | `/api/trips/:id/assistant` | chat contestuale → risposta + proposte |
| POST | `/api/trips/:id/assistant/apply` | applica proposte accettate |
| POST/DELETE | `/api/trips/:id/expenses[/:expenseId]` | spese |

Autenticazione, creazione/modifica/duplicazione/eliminazione viaggi usano **Server Actions** (form progressivi,
protezione CSRF integrata di Next.js) che chiamano gli stessi servizi.

## 8. Tech stack consigliato

| Area | Scelta | Motivazione |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | SSR/SSG per SEO delle pagine destinazione, streaming con Suspense, route handlers e server actions nello stesso progetto |
| Stile | **Tailwind CSS v4** con design token in `@theme` | design system coerente, zero runtime |
| DB | **PostgreSQL** via **Drizzle ORM** (postgres-js); in locale PGlite | zero setup in locale; stesso dialetto e stesso driver in sviluppo e in produzione (Vercel + Neon) |
| Validazione | **zod** | stessi schemi per form, API e output AI |
| Auth | Sessioni proprie su DB (scrypt, cookie httpOnly) | nessuna dipendenza esterna; sostituibile con Auth.js/Clerk |
| Dati voli/alloggi | **SerpApi** (Google Flights/Hotels) dietro interfacce `FlightProvider`/`AccommodationProvider` | prezzi reali con link ai venditori senza accordi commerciali; Skyscanner e Amadeus Self-Service non sono più accessibili a progetti piccoli. Cache e quota su DB |
| Mappa | **Leaflet + react-leaflet** con tile OpenStreetMap/CARTO | gratuito, nessuna API key; MapsProvider separato per routing/geocoding |
| Drag & drop | **@dnd-kit** | accessibile (tastiera), supporto touch |
| AI | **Claude (Anthropic SDK)** con tool use, fallback rule-based | l'AI produce *operazioni tipizzate* sul viaggio, non testo libero |
| UI feedback | sonner (toast), lucide-react (icone), font Inter + Bricolage Grotesque self-hosted | |
| Test | vitest | algoritmo itinerario, optimizer, budget |

## 9. Project folder structure

```
src/
├── app/                      routing (pagine, layout, route handlers)
│   ├── (marketing)/ …        home, ispirazione, prezzi, destinazioni
│   ├── (auth)/ …             accedi, registrati, recupero password
│   ├── viaggi/ …             dashboard e viaggio
│   └── api/ …                route handlers
├── components/               UI per dominio (ui, layout, search, flights, stays, trips, itinerary, map, …)
├── lib/                      codice condiviso client/server puro (format, date, geo, itinerary reflow, types)
├── server/
│   ├── db/                   schema Drizzle, client, migrazioni
│   ├── auth/                 sessioni, password, guard
│   ├── providers/            interfacce + registry + mock/
│   ├── mock-data/            catalogo destinazioni, POI, aeroporti (DATI DEMO)
│   ├── services/             logica applicativa
│   └── security/             rate limit, origin check
└── proxy.ts                  redirect rapido per rotte protette
```

## 10. Roadmap di sviluppo

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Architettura, design system, homepage | ✅ |
| 2 | Ricerca destinazioni (precisa e flessibile), ispirazione, pagina destinazione | ✅ |
| 3 | Voli + alloggi: risultati, filtri, ordinamenti, bozza viaggio | ✅ |
| 4 | Autenticazione + creazione/salvataggio viaggi | ✅ |
| 5 | Dashboard "I miei viaggi" (apri, modifica, duplica, elimina, stati) | ✅ |
| 6 | Itinerary builder (generazione, DnD, CRUD, rigenera giorno) | ✅ |
| 7 | Mappa interattiva sincronizzata | ✅ |
| 8 | Budget tracker | ✅ |
| 9 | AI travel assistant contestuale | ✅ |
| 10 | Optimizer, polish, accessibilità, performance | ✅ (prima iterazione) |

## 11. Principali rischi tecnici

| Rischio | Mitigazione |
|---|---|
| **API di voli/hotel a pagamento con quota** (SerpApi: 250 ricerche/mese gratis) | Cache persistente su DB, contatore mensile con riserva per le ricerche dirette, deduplica delle richieste in corso, nessuna chiamata automatica da home/crawler, prezzi indicativi "garantisci N noti", optimizer su richiesta |
| **Formato delle risposte del provider non verificabile in anticipo** | Parsing permissivo con zod, scarto dei singoli elementi non validi, errore esplicito "formato inatteso" se non resta nulla; `npm run check:providers` confronta la forma reale con quella attesa |
| **Prezzi volatili**: la selezione salvata può non essere più valida | Le offerte salvate sono *snapshot* con timestamp; ri-verifica al momento della prenotazione (Booking) |
| **Qualità dell'itinerario** (orari irrealistici) | Algoritmo deterministico testato: tempi di spostamento, aperture, finestre volo/check-in; l'AI non scrive mai direttamente il DB |
| **Conflitti tra modifiche manuali e rigenerazione** | Flag `isUserModified` per giornata e attività, `timeLocked` per orari fissati a mano |
| **AI non affidabile / costi** | Output vincolato a operazioni tipizzate validate con zod, anteprima obbligatoria, rate limit, fallback rule-based |
| **Funzioni serverless e connessioni al database** | connessione "pooled" di Neon, `prepare: false` e poche connessioni per istanza; migrazioni in build, non a runtime |
| **Mappa pesante su mobile** | Leaflet caricato lazy solo nella pagina itinerario; vista Lista/Mappa alternata su mobile |
| **Rate limit in memoria** non condiviso tra istanze | Interfaccia sostituibile con Redis/Upstash in produzione |
| **Immagini esterne** lente o non disponibili | `next/image` con loader del CDN, lazy loading e fallback a gradiente |

## 12. MVP vs funzionalità future

**MVP (questa implementazione)**

- Ricerca precisa e flessibile, ispirazione per categorie, pagine destinazione
- Voli e alloggi con filtri/ordinamenti (provider mock chiaramente etichettati)
- Bozza viaggio senza account, salvataggio con login
- Dashboard viaggi con stati, duplica, elimina
- Itinerario generato automaticamente, completamente modificabile (DnD, sposta giorno, rigenera giorno)
- Mappa numerata sincronizzata con l'ordine delle attività
- Budget previsto/effettivo, per persona, medio giornaliero, avviso di sforamento
- Optimizer (date flessibili, volo/hotel più economico, riordino attività)
- Assistente AI contestuale con proposte applicabili

**Future**

- Provider reali (Duffel/Amadeus, Booking/Expedia affiliate, Google Places) e checkout
- Viaggi condivisi e collaborativi (inviti, voti sulle attività, divisione spese tra amici)
- Notifiche (cambi prezzo, promemoria check-in), modalità offline/PWA durante il viaggio
- Export calendario (.ics) e PDF, condivisione pubblica dell'itinerario
- Alert di prezzo e calendario prezzi live, multi-città, treni e bus
- Internazionalizzazione (i18n) e multi-valuta
