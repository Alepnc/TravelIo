---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/viaggi","src/app/cerca","src/components"]
---

# TravelIo app: tabellone partenze

Scope: whole web app (home Persuade; search, discovery, trips, itinerary, budget Operate). Mode: Persuade for `/`, Operate for everything under `/viaggi`, `/cerca`, auth and profile; Read is not in scope.
Audience and job: young budget travellers on phones, from a vague idea to one saved trip (PRODUCT.md).
Constraints from user: no purple-blue gradients, no card inside card, no all-centered layouts. WCAG 2.2 AA. Future i18n: board cells must survive longer words (truncate per cell, never overflow).

## Direction contract

THESIS: TravelIo is the departures board of your own airport: where you can go, when, for how much, and the trip you chose stays on the board as your row. It refuses the booking-portal arrangement (photo hero, centred search pill, grid of equal destination cards) and the dark "AI planner" chat.

OWN-WORLD: Solari-style split-flap board. Flap black #0e0f11 board panels with white condensed caps in fixed character cells, steel frame #2a2d31, concourse ground light steel #eceeef with white work surfaces, amber #ffb000 for the one thing to act on (primary action, selection, "da rilevare" → price), cancel red #c4161c for over-budget, errors and cancelled. Archivo variable: condensed caps (wdth 62-75) for board cells and headlines, normal width for UI and body. 4px radius everywhere, 2px on flap cells. Rows and ruled columns instead of cards; Phosphor icons.

STORY: the visitor sees departures from their airport with real or indicative prices, understands they can leave everything open, filters the board into a search, picks a row, and the trip becomes their row with a status (In pianificazione, Confermato, In corso, Completato) and a timetable (itinerary) and a ledger (budget).

FIRST VIEWPORT: dark steel nav strip with the TRAVELIO flap wordmark at left. Below, the board owns the full container width, left aligned: header line "PARTENZE DA NAPOLI" in large flap cells, one sentence of concourse text, then the search set into the board as its editable header row (Da, A, Quando, Viaggiatori, Budget, amber Cerca). Beneath, 6 departure rows (meta, paese, periodo, A/R, stato) each a link; rows cascade character by character when the month changes. Primary action is the amber Cerca at the row's right end.

FORM: challenger "split-flap concourse" (signals-instruments-split-flap-concourse) won over the assigned postcard (position 4 of the grounded list) by user choice; seed key f88a1df9. Signature interaction: per-character flap cascade on board text (FlapText), reduced-motion instant. Kept raises: inline editing over modals; budget escalation calm → amber "attenzione" → red "sforato"; every trip has a fast row form (draft bar, mobile) beside its full form; empty days collapse to an outline with one fill action; one left axis orders every page.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
