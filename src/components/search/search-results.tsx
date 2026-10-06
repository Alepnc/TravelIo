"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowsLeftRight as ArrowLeftRight, Bed as BedDouble, Check, ArrowSquareOut as ExternalLink, AirplaneTilt as Plane, SlidersHorizontal } from "@phosphor-icons/react/dist/ssr";
import type { AccommodationOffer, FlightOffer } from "@/lib/types";
import {
  countActive,
  EMPTY_FLIGHT_FILTERS,
  EMPTY_STAY_FILTERS,
  filterFlights,
  filterStays,
  flightBadges,
  sortFlights,
  sortStays,
  type FlightFilters,
  type FlightSort,
  type StayFilters,
  type StaySort,
} from "@/lib/filters";
import { FlightCard } from "@/components/flights/flight-card";
import { StayCard } from "@/components/stays/stay-card";
import { FlightFilterPanel, StayFilterPanel } from "./filter-panels";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { BookingSheet, type BookingRequest } from "@/components/booking/booking-sheet";
import { useDraft, type DraftSearch } from "@/components/draft/draft-provider";
import { cn, formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/time";

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

type Tab = "voli" | "alloggi";

interface Props {
  search: Required<Pick<DraftSearch, "from" | "to" | "depart" | "ret" | "travelers">> & { budget?: number };
  destinationName: string;
  outbound: Loaded<FlightOffer[]>;
  inbound: Loaded<FlightOffer[]>;
  stays: Loaded<AccommodationOffer[]>;
  /** Se presente, "Seleziona" aggiunge direttamente al viaggio salvato */
  tripId?: string;
  initialTab?: Tab;
}

const FLIGHT_SORTS: { key: FlightSort; label: string }[] = [
  { key: "valore", label: "Miglior rapporto qualità/prezzo" },
  { key: "prezzo", label: "Prezzo più basso" },
  { key: "durata", label: "Durata più breve" },
  { key: "orario", label: "Orario di partenza" },
];
const STAY_SORTS: { key: StaySort; label: string }[] = [
  { key: "valore", label: "Miglior rapporto qualità/prezzo" },
  { key: "prezzo", label: "Prezzo più basso" },
  { key: "voto", label: "Valutazione più alta" },
  { key: "distanza", label: "Più vicino al centro" },
];

export function SearchResults({ search, destinationName, outbound, inbound, stays, tripId, initialTab = "voli" }: Props) {
  const router = useRouter();
  const { draft, setSearch, select } = useDraft();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [direction, setDirection] = useState<"andata" | "ritorno">("andata");
  const [flightSort, setFlightSort] = useState<FlightSort>("valore");
  const [staySort, setStaySort] = useState<StaySort>("valore");
  const [flightFilters, setFlightFilters] = useState<FlightFilters>(EMPTY_FLIGHT_FILTERS);
  const [stayFilters, setStayFilters] = useState<StayFilters>(EMPTY_STAY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [tripSelection, setTripSelection] = useState<Record<string, string>>({});
  const [booking, setBooking] = useState<{ title: string; request: BookingRequest } | null>(null);
  const openBooking = (kind: "flight" | "stay", offerId: string, title: string) => setBooking({ title, request: { url: "/api/booking", body: { kind, offerId } } });

  // Sincronizza la bozza con la ricerca corrente (solo se non stiamo lavorando su un viaggio salvato)
  useEffect(() => {
    if (!tripId) setSearch(search, destinationName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, search.from, search.to, search.depart, search.ret, search.travelers, search.budget, destinationName]);

  const flightsLoaded = direction === "andata" ? outbound : inbound;
  const flightList = useMemo(() => (flightsLoaded.ok ? sortFlights(filterFlights(flightsLoaded.data, flightFilters), flightSort) : []), [flightsLoaded, flightFilters, flightSort]);
  const badges = useMemo(() => flightBadges(flightsLoaded.ok ? flightsLoaded.data : []), [flightsLoaded]);
  const stayList = useMemo(() => (stays.ok ? sortStays(filterStays(stays.data, stayFilters), staySort) : []), [stays, stayFilters, staySort]);
  const stayBadges = useMemo(() => {
    const m = new Map<string, string[]>();
    if (!stays.ok || !stays.data.length) return m;
    const cheapest = stays.data.reduce((a, b) => (b.priceTotal < a.priceTotal ? b : a));
    m.set(cheapest.id, ["Più economico"]);
    return m;
  }, [stays]);

  const selectedOut = tripId ? tripSelection.andata : draft?.outbound?.id;
  const selectedBack = tripId ? tripSelection.ritorno : draft?.inbound?.id;
  const selectedStay = tripId ? tripSelection.stay : draft?.stay?.id;

  async function chooseFlight(offer: FlightOffer) {
    if (!tripId) {
      select(direction === "andata" ? { outbound: offer } : { inbound: offer });
      toast.success(`Volo di ${direction} aggiunto alla bozza`, { description: `${offer.airline} · ${formatPrice(offer.price)} a persona` });
      if (direction === "andata" && !draft?.inbound) setDirection("ritorno");
      else if (!draft?.stay) setTab("alloggi");
      return;
    }
    setPending(offer.id);
    const res = await fetch(`/api/trips/${tripId}/flights`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId: offer.id, direction }) });
    setPending(null);
    if (!res.ok) return toast.error((await res.json().catch(() => null))?.error ?? "Impossibile aggiungere il volo");
    setTripSelection((s) => ({ ...s, [direction]: offer.id }));
    toast.success(`Volo di ${direction} salvato nel viaggio`, { action: { label: "Vai al viaggio", onClick: () => router.push(`/viaggi/${tripId}`) } });
    if (direction === "andata") setDirection("ritorno");
  }

  async function chooseStay(offer: AccommodationOffer) {
    if (!tripId) {
      select({ stay: offer });
      toast.success("Alloggio aggiunto alla bozza", { description: offer.name });
      return;
    }
    setPending(offer.id);
    const res = await fetch(`/api/trips/${tripId}/accommodation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId: offer.id }) });
    setPending(null);
    if (!res.ok) return toast.error((await res.json().catch(() => null))?.error ?? "Impossibile aggiungere l'alloggio");
    setTripSelection((s) => ({ ...s, stay: offer.id }));
    toast.success("Alloggio salvato nel viaggio", { action: { label: "Vai al viaggio", onClick: () => router.push(`/viaggi/${tripId}`) } });
  }

  // Il dato più vecchio tra quelli mostrati: è il limite di "freschezza" da dichiarare all'utente
  const fetchedAt = useMemo(() => {
    const stamps = (tab === "voli" ? (flightsLoaded.ok ? flightsLoaded.data : []) : stays.ok ? stays.data : []).map((o) => o.fetchedAt).filter((x): x is string => !!x);
    return stamps.length ? stamps.reduce((a, b) => (a < b ? a : b)) : null;
  }, [tab, flightsLoaded, stays]);

  const activeFilters = tab === "voli" ? countActive(flightFilters) : countActive(stayFilters);
  const resetFilters = () => (tab === "voli" ? setFlightFilters(EMPTY_FLIGHT_FILTERS) : setStayFilters(EMPTY_STAY_FILTERS));
  const panel =
    tab === "voli" ? (
      <FlightFilterPanel offers={flightsLoaded.ok ? flightsLoaded.data : []} value={flightFilters} onChange={setFlightFilters} />
    ) : (
      <StayFilterPanel offers={stays.ok ? stays.data : []} value={stayFilters} onChange={setStayFilters} />
    );
  const total = tab === "voli" ? (flightsLoaded.ok ? flightsLoaded.data.length : 0) : stays.ok ? stays.data.length : 0;
  const shown = tab === "voli" ? flightList.length : stayList.length;

  return (
    <div>
      {/* Tab principali */}
      <div className="inline-flex gap-px overflow-hidden rounded-md bg-ink/15 p-px" role="tablist" aria-label="Tipo di risultato">
        {([["voli", "Voli", Plane], ["alloggi", "Alloggi", BedDouble]] as const).map(([key, label, Icon]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn("flex h-11 items-center gap-2 px-5 text-sm font-semibold transition-colors duration-150 first:rounded-l-[3px] last:rounded-r-[3px]", tab === key ? "bg-ink text-board-text" : "bg-surface text-ink-soft hoverable:hover:text-ink")}>
            <Icon className="h-4 w-4" /> {label}
            {key === "voli" && (selectedOut || selectedBack) && <Check className="h-4 w-4 text-brand-500" weight="bold" aria-label="selezionato" />}
            {key === "alloggi" && selectedStay && <Check className="h-4 w-4 text-brand-500" weight="bold" aria-label="selezionato" />}
          </button>
        ))}
      </div>

      {fetchedAt && (
        <p className="mt-3 text-xs text-muted">
          Prezzi rilevati alle{" "}
          <time dateTime={fetchedAt} suppressHydrationWarning>
            {new Date(fetchedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </time>{" "}
          da Google. Cambiano di continuo: il prezzo finale è quello del sito del venditore.
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Filtri desktop */}
        <aside className="hidden lg:block" aria-label="Filtri">
          <div className="sticky top-20 border-t border-ink pt-1">
            <div className="flex items-center justify-between pb-1 pt-4">
              <p className="text-lg font-bold [font-stretch:85%]">Filtri</p>
              {activeFilters > 0 && (
                <button onClick={resetFilters} className="text-sm font-semibold underline underline-offset-4">
                  Azzera
                </button>
              )}
            </div>
            {panel}
          </div>
        </aside>

        <div className="min-w-0">
          {tab === "voli" && (
            <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-board-frame p-px" role="tablist" aria-label="Tratta">
              {(["andata", "ritorno"] as const).map((d) => {
                const date = d === "andata" ? search.depart : search.ret;
                const sel = d === "andata" ? selectedOut : selectedBack;
                return (
                  <button key={d} role="tab" aria-selected={direction === d} onClick={() => setDirection(d)} className={cn("flex flex-col items-start px-4 py-2.5 text-left transition-colors duration-150", direction === d ? "bg-board text-board-text shadow-[inset_0_-3px_0_var(--color-brand-500)]" : "bg-board-cell text-board-dim hoverable:hover:text-board-text")}>
                    <span className="flap flex items-center gap-1.5 text-base">
                      {d} {sel && <Check className="h-4 w-4 text-brand-500" weight="bold" />}
                    </span>
                    <span className="text-xs">{formatDate(date, { weekday: true })}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {shown === total ? `${total} risultati` : `${shown} di ${total} risultati`}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setFiltersOpen(true)} className="press flex h-9 items-center gap-1.5 rounded-md border border-ink/20 bg-surface px-3 text-sm font-semibold lg:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filtri{activeFilters ? ` (${activeFilters})` : ""}
              </button>
              <label className="sr-only" htmlFor="sort">
                Ordina per
              </label>
              <select
                id="sort"
                className="h-9 max-w-48 rounded-md border border-ink/20 bg-surface px-2.5 text-sm font-semibold sm:max-w-none"
                value={tab === "voli" ? flightSort : staySort}
                onChange={(e) => (tab === "voli" ? setFlightSort(e.target.value as FlightSort) : setStaySort(e.target.value as StaySort))}
              >
                {(tab === "voli" ? FLIGHT_SORTS : STAY_SORTS).map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tab === "voli" ? (
            !flightsLoaded.ok ? (
              <ErrorState title="Non riusciamo a caricare i voli" description={flightsLoaded.error} action={<Button variant="outline" onClick={() => router.refresh()}>Riprova</Button>} />
            ) : flightsLoaded.data.length === 0 ? (
              <EmptyState icon={<Plane className="h-5 w-5" />} title="Nessun volo trovato" description="Non ci sono voli per questa data. Prova a spostare la partenza di un giorno o a cambiare aeroporto." />
            ) : flightList.length === 0 ? (
              <EmptyState icon={<SlidersHorizontal className="h-5 w-5" />} title="Nessun volo con questi filtri" description="Allarga i filtri per vedere più opzioni." action={<Button variant="outline" onClick={resetFilters}>Azzera filtri</Button>} />
            ) : (
              <ul className="space-y-2">
                {flightList.map((o) => {
                  const isSelected = o.id === (direction === "andata" ? selectedOut : selectedBack);
                  return (
                    <li key={o.id}>
                      <FlightCard
                        offer={o}
                        travelers={search.travelers}
                        badges={badges.get(o.id)}
                        selected={isSelected}
                        action={
                          <div className="flex gap-1.5">
                            {o.bookingRef && (
                              <Button size="sm" variant="outline" onClick={() => openBooking("flight", o.id, `Prenota ${o.fromCode} → ${o.toCode}`)} icon={<ExternalLink className="h-3.5 w-3.5" />}>
                                Vedi offerte
                              </Button>
                            )}
                            <Button size="sm" variant={isSelected ? "outline" : "secondary"} loading={pending === o.id} onClick={() => chooseFlight(o)} icon={isSelected ? <Check className="h-4 w-4" /> : undefined}>
                              {isSelected ? "Scelto" : "Seleziona"}
                            </Button>
                          </div>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )
          ) : !stays.ok ? (
            <ErrorState title="Non riusciamo a caricare gli alloggi" description={stays.error} action={<Button variant="outline" onClick={() => router.refresh()}>Riprova</Button>} />
          ) : stays.data.length === 0 ? (
            <EmptyState icon={<BedDouble className="h-5 w-5" />} title="Nessun alloggio disponibile" description="Per queste date non ci sono strutture disponibili. Prova con date diverse." />
          ) : stayList.length === 0 ? (
            <EmptyState icon={<SlidersHorizontal className="h-5 w-5" />} title="Nessun alloggio con questi filtri" description="Allarga i filtri per vedere più opzioni." action={<Button variant="outline" onClick={resetFilters}>Azzera filtri</Button>} />
          ) : (
            <ul className="space-y-2">
              {stayList.map((s) => {
                const isSelected = s.id === selectedStay;
                return (
                  <li key={s.id}>
                    <StayCard
                      offer={s}
                      selected={isSelected}
                      badges={stayBadges.get(s.id)}
                      action={
                        <div className="flex gap-1.5">
                          {s.bookingRef && (
                            <Button size="sm" variant="outline" onClick={() => openBooking("stay", s.id, `Prenota ${s.name}`)} icon={<ExternalLink className="h-3.5 w-3.5" />}>
                              Vedi offerte
                            </Button>
                          )}
                          <Button size="sm" variant={isSelected ? "outline" : "secondary"} loading={pending === s.id} onClick={() => chooseStay(s)} icon={isSelected ? <Check className="h-4 w-4" /> : undefined}>
                            {isSelected ? "Scelto" : "Seleziona"}
                          </Button>
                        </div>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtri"
        footer={
          <div className="flex gap-2 pb-1">
            <Button variant="ghost" className="flex-1" onClick={resetFilters}>
              Azzera
            </Button>
            <Button className="flex-[2]" onClick={() => setFiltersOpen(false)}>
              Mostra {shown} risultati
            </Button>
          </div>
        }
      >
        {panel}
      </Sheet>

      <BookingSheet open={!!booking} onClose={() => setBooking(null)} title={booking?.title ?? ""} request={booking?.request ?? null} />

      {tripId && (
        <div className="mt-8">
          <Link href={`/viaggi/${tripId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
            <ArrowLeftRight className="h-4 w-4" /> Torna al viaggio
          </Link>
        </div>
      )}
    </div>
  );
}
