# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Giovani, studenti, gruppi di amici, coppie e viaggiatori indipendenti con budget limitato. Spesso partono da un'idea vaga ("mare ad agosto con 500 €", "da Napoli, ovunque") e non da una destinazione. L'obiettivo è arrivare a un viaggio completo (voli, alloggio, itinerario giorno per giorno, budget) senza saltare tra dieci siti diversi. Usano soprattutto il telefono, sia mentre pianificano sia durante il viaggio (itinerario, mappa, spese).

## Product Purpose

TravelIo porta l'utente dall'idea all'itinerario in un'unica app: ispirazione → ricerca → confronto di voli e alloggi → salvataggio → itinerario su mappa → modifica → budget. È pensato come prodotto da lanciare a utenti reali, non solo come demo. Il successo è un viaggio creato, salvato e usato di nuovo: l'utente torna a controllare itinerario, spese e stato del viaggio invece di tornare ai siti dei singoli venditori.

## Positioning

**Tutto in un viaggio.** Ricerca, confronto, itinerario, mappa, budget, optimizer e assistente AI leggono e scrivono tutti sullo stesso oggetto: il Viaggio. Skyscanner, Google Flights e Booking risolvono un pezzo alla volta; TravelIo tiene insieme il percorso intero. Ogni funzione nuova deve rafforzare questo oggetto unico, non diventare uno strumento a sé. Il budget è un dato forte del viaggio (totale della bozza, avviso di sforamento, Travel Optimizer), ma resta al servizio del viaggio unico e non è la posizione principale.

## Operating Context

- Si esplora **senza account**: la bozza (barra "Il tuo viaggio") vive nel browser. Il login serve solo per salvare, e la bozza sopravvive al login.
- La prenotazione avviene sui siti dei venditori (compagnie aeree, Booking.com, Expedia…): TravelIo mostra i prezzi e rimanda lì con "Vedi offerte" / "Prenota". Non incassa pagamenti.
- Stati del viaggio: Pianificazione → Confermato → In corso → Completato. Il viaggio ha partecipanti.
- Uso mobile-first: tab bar su mobile, schermate di itinerario e budget consultate anche durante il viaggio.

## Capabilities and Constraints

- **Prezzi reali**: voli e alloggi arrivano da Google Flights e Google Hotels tramite SerpApi. Senza chiave l'app lo dice chiaramente e **non mostra dati finti**. La quota SerpApi è limitata (cache e controllo della quota lato server).
- Destinazioni, descrizioni e attività sono un catalogo curato incluso nel progetto, non prezzi di mercato; i prezzi indicativi delle mete vanno presentati come tali.
- Itinerario generato automaticamente rispettando voli, check-in/out, orari di apertura, distanze, ritmo, budget e interessi. Drag & drop anche tra giorni, rigenerazione di una singola giornata. **Le modifiche manuali non vengono mai sovrascritte.**
- Travel Optimizer: suggerimenti azionabili con un clic (date più convenienti, volo/alloggio più economico, attività da spostare).
- Assistente AI contestuale al viaggio e al giorno aperto: **propone** operazioni tipizzate, l'utente le approva. Claude se è presente `ANTHROPIC_API_KEY`, altrimenti un motore a regole (demo).
- Mappa: Leaflet + OpenStreetMap, nessuna chiave; tappe numerate nell'ordine del giorno.
- "Prezzi" (`/prezzi`) è un esploratore delle mete più economiche, non un listino: il prodotto non ha piani a pagamento nell'MVP.
- Stack esistente: Next.js 16 (App Router), React 19, Tailwind 4, Drizzle (SQLite in sviluppo, PostgreSQL previsto in produzione).
- Riferimento completo di prodotto e architettura: `docs/ARCHITETTURA.md`.

## Brand Commitments

- Nome: **TravelIo**. Promessa: "Dall'idea all'itinerario, in un'unica app."
- Lingua dell'interfaccia: italiano (`lang="it"`, locale `it_IT`), con termini propri del prodotto: Viaggio, Bozza / "Il tuo viaggio", Itinerario, Travel Optimizer, Ispirazione, Prezzi, "Vedi offerte".
- Voce: diretta e onesta su prezzi e limiti (dice quando un dato non è disponibile invece di inventarlo); concreta nei suggerimenti ("Partendo un giorno prima risparmi 84 €").
- Non esistono ancora un logo o asset di marca dedicati nel repository.

## Evidence on Hand

- Funzionalità reali e testate (itinerario, budget, filtri, optimizer, assistente, parsing SerpApi, cache e quota): vedi `README.md` e i test.
- Nessuna testimonianza, nessun numero di utenti, nessuna recensione, nessuna partnership o copertura stampa. Il lavoro futuro non deve inventarne.
- Nessuna fotografia o illustrazione di proprietà nel repository oltre alle immagini del catalogo destinazioni.

## Product Principles

1. **Un solo oggetto centrale: il Viaggio.** Ogni schermata legge e scrive sullo stesso viaggio; nessuno strumento isolato.
2. **Decisioni, non solo risultati.** Ogni lista aiuta a scegliere ("miglior rapporto qualità/prezzo", suggerimenti dell'optimizer applicabili con un clic).
3. **L'utente comanda.** Le modifiche manuali restano intatte; l'AI propone, l'utente applica.
4. **Dati veri o niente.** Prezzi reali con fonte chiara; quando mancano, lo si dice. Mai dati finti presentati come reali.
5. **Prima esplora, poi registrati.** Nessun muro di login prima del salvataggio.

## Accessibility & Inclusion

- Standard richiesto: **WCAG 2.2 AA** su tutto il prodotto, incluse le interazioni complesse (drag & drop dell'itinerario con alternativa da tastiera, mappa con equivalente testuale nella lista, sheet e popover con gestione del focus).
- **Multilingua in futuro**: oggi solo italiano, ma testi, layout e formati (date, valute, numeri) devono reggere altre lingue e testi più lunghi senza riscritture strutturali.
- Target touch su mobile adeguati: l'uso principale è da telefono.
