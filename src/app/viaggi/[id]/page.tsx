import { DataSourceBadge } from "@/components/ui/data-source-badge";
import Link from "next/link";
import { ArrowRight, BedDouble, Check, Circle, MapPin, Plane, Route, Search, Sparkles, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/misc";
import { CoverImage } from "@/components/ui/cover-image";
import { BudgetBar, BudgetLines, BudgetStatus } from "@/components/budget/budget-summary";
import { SuggestionList } from "@/components/optimizer/suggestions";
import { RemoveButton } from "@/components/trips/remove-button";
import { TripBookButton } from "@/components/booking/trip-book-button";
import { STAY_TYPE_LABEL } from "@/components/stays/stay-card";
import { computeBudget } from "@/lib/budget";
import type { TripDetail } from "@/lib/dto";
import { cn, formatPrice, pluralize } from "@/lib/format";
import { formatDate, formatDuration, timeOf } from "@/lib/time";
import { loadTrip } from "@/server/load-trip";

function searchHref(trip: TripDetail, tab: "voli" | "alloggi") {
  const p = new URLSearchParams({ trip: trip.id, to: trip.destinationId, depart: trip.startDate, ret: trip.endDate, travelers: String(trip.travelersCount), tab });
  if (trip.originCode) p.set("from", trip.originCode);
  if (trip.budgetPerPerson) p.set("budget", String(trip.budgetPerPerson));
  return `/cerca?${p}`;
}

function Checklist({ trip }: { trip: TripDetail }) {
  const steps = [
    { done: trip.flights.length === 2, label: "Scegli i voli", href: searchHref(trip, "voli") },
    { done: !!trip.stay, label: "Scegli l'alloggio", href: searchHref(trip, "alloggi") },
    { done: !!trip.itinerary, label: "Genera l'itinerario", href: `/viaggi/${trip.id}/itinerario` },
    { done: !!trip.budgetPerPerson, label: "Imposta il budget", href: `/viaggi/${trip.id}/modifica` },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Prossimi passi</h2>
        <span className="text-sm font-semibold text-muted">
          {done}/{steps.length}
        </span>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium", s.done ? "text-muted line-through" : "bg-brand-50 text-brand-800 hoverable:hover:bg-brand-100")}>
              {s.done ? <Check className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
              {s.label}
              {!s.done && <ArrowRight className="ml-auto h-4 w-4" />}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default async function TripOverviewPage({ params, searchParams }: PageProps<"/viaggi/[id]">) {
  const { id } = await params;
  const { creato } = await searchParams;
  const { trip } = await loadTrip(id);
  const budget = computeBudget(trip);
  const out = trip.flights.find((f) => f.direction === "andata");
  const back = trip.flights.find((f) => f.direction === "ritorno");

  return (
    <Container className="grid gap-6 pb-28 pt-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        {creato && (
          <div className="flex items-center gap-3 rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success animate-fade-up" role="status">
            <Sparkles className="h-5 w-5" /> Viaggio creato e salvato nel tuo account!
          </div>
        )}
        <Checklist trip={trip} />

        {/* Voli */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Plane className="h-5 w-5 text-brand-500" /> Voli
            </h2>
            <LinkButton href={searchHref(trip, "voli")} variant="outline" size="sm" icon={<Search className="h-4 w-4" />}>
              {trip.flights.length ? "Cambia" : "Cerca voli"}
            </LinkButton>
          </div>
          {trip.flights.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nessun volo ancora. Cercali e confrontali: l&apos;itinerario userà gli orari di arrivo e partenza.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {[out, back].filter(Boolean).map((f) => (
                <li key={f!.id} className="flex items-center gap-4 rounded-2xl bg-ink/[0.03] p-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-xs font-bold shadow-sm">{f!.airlineCode}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {f!.direction} · {formatDate(f!.departAt.slice(0, 10), { weekday: true })}
                    </p>
                    <p className="font-semibold">
                      {f!.fromCode} {timeOf(f!.departAt)} → {f!.toCode} {timeOf(f!.arriveAt)}
                    </p>
                    <p className="text-xs text-muted">
                      {f!.airline} · {formatDuration(f!.durationMin)} · {f!.stops ? "1 scalo" : "diretto"}
                    </p>
                  </div>
                  <p className="text-right font-bold tabular-nums">
                    {formatPrice(f!.pricePerPerson)}
                    <span className="block text-xs font-normal text-muted">a persona</span>
                  </p>
                  {f!.canBook && <TripBookButton tripId={trip.id} kind="flight" itemId={f!.id} title={`Prenota ${f!.fromCode} → ${f!.toCode}`} />}
                  <RemoveButton url={`/api/trips/${trip.id}/flights?flightId=${f!.id}`} label="Volo" />
                </li>
              ))}
              {trip.flights.length === 1 && (
                <li className="text-sm text-muted">
                  Manca il volo di {out ? "ritorno" : "andata"}.{" "}
                  <Link href={searchHref(trip, "voli")} className="font-semibold text-brand-600">
                    Aggiungilo
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>

        {/* Alloggio */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <BedDouble className="h-5 w-5 text-brand-500" /> Alloggio
            </h2>
            <LinkButton href={searchHref(trip, "alloggi")} variant="outline" size="sm" icon={<Search className="h-4 w-4" />}>
              {trip.stay ? "Cambia" : "Cerca alloggi"}
            </LinkButton>
          </div>
          {trip.stay ? (
            <div className="mt-4 flex gap-4">
              <CoverImage src={trip.stay.imageUrl} alt={trip.stay.name} sizes="112px" className="h-24 w-28 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{STAY_TYPE_LABEL[trip.stay.type]}</p>
                <p className="truncate font-semibold">{trip.stay.name}</p>
                <p className="flex items-center gap-1 text-sm text-muted">
                  <MapPin className="h-3.5 w-3.5" /> {trip.stay.neighborhood ? `${trip.stay.neighborhood} · ` : ""}{trip.stay.rating > 0 ? `voto ${trip.stay.rating.toFixed(1)}` : "nessuna recensione"}
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-bold">{formatPrice(trip.stay.priceTotal)}</span> <span className="text-muted">totale · {formatPrice(trip.stay.pricePerNight)}/notte</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {trip.stay.canBook && <TripBookButton tripId={trip.id} kind="stay" itemId={trip.stay.id} title={`Prenota ${trip.stay.name}`} />}
                <RemoveButton url={`/api/trips/${trip.id}/accommodation`} label="Alloggio" />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Scegli dove dormire: l&apos;itinerario partirà e terminerà ogni giorno dal tuo alloggio.</p>
          )}
        </Card>

        {/* Itinerario */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Route className="h-5 w-5 text-brand-500" /> Itinerario
            </h2>
            <LinkButton href={`/viaggi/${trip.id}/itinerario`} variant={trip.itinerary ? "outline" : "secondary"} size="sm">
              {trip.itinerary ? "Apri" : "Genera itinerario"}
            </LinkButton>
          </div>
          {trip.itinerary ? (
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {trip.itinerary.days.map((d) => (
                <li key={d.id}>
                  <Link href={`/viaggi/${trip.id}/itinerario?giorno=${d.dayIndex + 1}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 hoverable:hover:border-ink/30">
                    <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <span className="text-[10px] font-bold uppercase leading-none">G</span>
                      <span className="text-sm font-bold leading-none">{d.dayIndex + 1}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{d.title}</span>
                      <span className="block text-xs text-muted">
                        {formatDate(d.date, { weekday: true })} · {pluralize(d.activities.length, "attività", "attività")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted">Generiamo le giornate tenendo conto di voli, alloggio, orari di apertura e distanze. Poi lo modifichi come vuoi.</p>
          )}
        </Card>

        {/* Partecipanti */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Users className="h-5 w-5 text-brand-500" /> Chi parte
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {trip.travelers.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-full bg-ink/5 py-1 pl-1 pr-3 text-sm font-medium">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{t.name.slice(0, 1).toUpperCase()}</span>
                {t.name}
                {t.isOwner && <span className="text-xs text-muted">(tu)</span>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Budget</h2>
            <Link href={`/viaggi/${trip.id}/budget`} className="text-sm font-semibold text-brand-600">
              Dettagli
            </Link>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="font-display text-3xl font-extrabold">{formatPrice(budget.perPerson)}</p>
            <p className="text-sm text-muted">a persona{trip.budgetPerPerson ? ` su ${formatPrice(trip.budgetPerPerson)}` : ""}</p>
          </div>
          <div className="mt-3 space-y-3">
            <BudgetBar usage={budget.usage} />
            <BudgetStatus budget={budget} />
          </div>
          <div className="mt-4">
            <BudgetLines budget={budget} />
          </div>
        </Card>
        <SuggestionList tripId={trip.id} compact canComparePrices={trip.flights.length > 0 || !!trip.stay} />
        <div className="flex justify-center">
          <DataSourceBadge />
        </div>
      </aside>
    </Container>
  );
}
