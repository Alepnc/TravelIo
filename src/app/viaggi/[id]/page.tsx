import Link from "next/link";
import { ArrowRight, Bed as BedDouble, Check, MapPin, AirplaneTilt as Plane, Path as Route, MagnifyingGlass as Search, Sparkle as Sparkles, Users } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { FlapStatic, FlapText } from "@/components/ui/flap";
import { CoverImage } from "@/components/ui/cover-image";
import { BudgetBar, BudgetLines, BudgetStatus, budgetLevel } from "@/components/budget/budget-summary";
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

/** Sezione della panoramica: filetto nero in alto, titolo e azione sulla stessa riga. Niente card annidate. */
function Section({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t-2 border-ink pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl font-bold [font-stretch:82%]">
          {icon} {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
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
  const next = steps.find((s) => !s.done);
  return (
    <section aria-labelledby="next-steps" className="border-t-2 border-ink pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="next-steps" className="text-xl font-bold [font-stretch:82%]">Prossimi passi</h2>
        <span className="tabular text-sm font-semibold">
          {done} di {steps.length}
        </span>
      </div>
      <ol className="mt-3 grid border-t border-line sm:grid-cols-2 sm:gap-x-6">
        {steps.map((s) => (
          <li key={s.label} className="border-b border-line">
            <Link href={s.href} className={cn("flex items-center gap-2.5 px-2 py-3 text-sm font-semibold transition-colors duration-150", s.done ? "text-muted line-through" : s === next ? "bg-brand-500 text-ink hoverable:hover:bg-brand-300" : "hoverable:hover:bg-surface")}>
              {s.done ? <Check className="h-4 w-4" weight="bold" /> : <span className="h-4 w-4 rounded-xs border-2 border-ink" aria-hidden />}
              {s.label}
              {!s.done && <ArrowRight className="ml-auto h-4 w-4" weight="bold" />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function TripOverviewPage({ params, searchParams }: PageProps<"/viaggi/[id]">) {
  const { id } = await params;
  const { creato } = await searchParams;
  const { trip } = await loadTrip(id);
  const budget = computeBudget(trip);
  const level = budgetLevel(budget.usage);
  const out = trip.flights.find((f) => f.direction === "andata");
  const back = trip.flights.find((f) => f.direction === "ritorno");

  return (
    <Container className="grid gap-10 pb-28 pt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
      <div className="min-w-0 space-y-10">
        {creato && (
          <div className="flex items-center gap-3 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-board-text animate-fade-up" role="status">
            <Sparkles className="h-5 w-5" weight="fill" /> Viaggio creato e salvato nel tuo account.
          </div>
        )}
        <Checklist trip={trip} />

        <Section
          icon={<Plane className="h-5 w-5" />}
          title="Voli"
          action={
            <LinkButton href={searchHref(trip, "voli")} variant="outline" size="sm" icon={<Search className="h-4 w-4" />}>
              {trip.flights.length ? "Cambia" : "Cerca voli"}
            </LinkButton>
          }
        >
          {trip.flights.length === 0 ? (
            <p className="max-w-prose text-sm text-muted">Nessun volo ancora. Cercali e confrontali: l&apos;itinerario userà gli orari di arrivo e partenza.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {[out, back].filter(Boolean).map((f) => (
                <li key={f!.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 py-4">
                  <div className="w-20 shrink-0">
                    <p className="col-label text-muted">{f!.direction}</p>
                    <p className="mt-0.5 text-sm font-semibold">{formatDate(f!.departAt.slice(0, 10), { weekday: true })}</p>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-center">
                      <FlapStatic text={timeOf(f!.departAt)} className="text-lg" />
                      <span className="mt-1 block text-xs font-semibold text-muted">{f!.fromCode}</span>
                    </span>
                    <span className="relative h-px min-w-6 flex-1 bg-ink/30" aria-hidden>
                      <Plane className="absolute -top-2 right-0 h-4 w-4" weight="fill" />
                    </span>
                    <span className="text-center">
                      <FlapStatic text={timeOf(f!.arriveAt)} className="text-lg" />
                      <span className="mt-1 block text-xs font-semibold text-muted">{f!.toCode}</span>
                    </span>
                  </div>
                  <div className="min-w-0 text-xs text-muted sm:w-36">
                    <p className="truncate font-semibold text-ink">{f!.airline}</p>
                    <p>
                      {formatDuration(f!.durationMin)} · {f!.stops ? "1 scalo" : "diretto"}
                    </p>
                  </div>
                  <p className="tabular text-right text-lg font-bold leading-tight [font-stretch:85%]">
                    {formatPrice(f!.pricePerPerson)}
                    <span className="block text-xs font-normal text-muted [font-stretch:100%]">a persona</span>
                  </p>
                  <div className="flex items-center gap-1">
                    {f!.canBook && <TripBookButton tripId={trip.id} kind="flight" itemId={f!.id} title={`Prenota ${f!.fromCode} → ${f!.toCode}`} />}
                    <RemoveButton url={`/api/trips/${trip.id}/flights?flightId=${f!.id}`} label="Volo" />
                  </div>
                </li>
              ))}
              {trip.flights.length === 1 && (
                <li className="py-3 text-sm text-muted">
                  Manca il volo di {out ? "ritorno" : "andata"}.{" "}
                  <Link href={searchHref(trip, "voli")} className="font-semibold text-ink underline underline-offset-4">
                    Aggiungilo
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Section>

        <Section
          icon={<BedDouble className="h-5 w-5" />}
          title="Alloggio"
          action={
            <LinkButton href={searchHref(trip, "alloggi")} variant="outline" size="sm" icon={<Search className="h-4 w-4" />}>
              {trip.stay ? "Cambia" : "Cerca alloggi"}
            </LinkButton>
          }
        >
          {trip.stay ? (
            <div className="flex flex-wrap gap-4 border-y border-line py-4 sm:flex-nowrap">
              <CoverImage src={trip.stay.imageUrl} alt={trip.stay.name} sizes="160px" className="h-24 w-32 shrink-0 rounded-sm" />
              <div className="min-w-0 flex-1">
                <p className="col-label text-muted">{STAY_TYPE_LABEL[trip.stay.type]}</p>
                <p className="truncate text-lg font-semibold">{trip.stay.name}</p>
                <p className="flex items-center gap-1 text-sm text-muted">
                  <MapPin className="h-3.5 w-3.5" /> {trip.stay.neighborhood ? `${trip.stay.neighborhood} · ` : ""}
                  {trip.stay.rating > 0 ? `voto ${trip.stay.rating.toFixed(1)}` : "nessuna recensione"}
                </p>
                <p className="mt-1 text-sm">
                  <span className="tabular font-bold">{formatPrice(trip.stay.priceTotal)}</span> <span className="text-muted">totale · {formatPrice(trip.stay.pricePerNight)}/notte</span>
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {trip.stay.canBook && <TripBookButton tripId={trip.id} kind="stay" itemId={trip.stay.id} title={`Prenota ${trip.stay.name}`} />}
                <RemoveButton url={`/api/trips/${trip.id}/accommodation`} label="Alloggio" />
              </div>
            </div>
          ) : (
            <p className="max-w-prose text-sm text-muted">Scegli dove dormire: l&apos;itinerario partirà e terminerà ogni giorno dal tuo alloggio.</p>
          )}
        </Section>

        <Section
          icon={<Route className="h-5 w-5" />}
          title="Itinerario"
          action={
            <LinkButton href={`/viaggi/${trip.id}/itinerario`} variant={trip.itinerary ? "outline" : "secondary"} size="sm">
              {trip.itinerary ? "Apri" : "Genera itinerario"}
            </LinkButton>
          }
        >
          {trip.itinerary ? (
            <ol className="grid border-t border-line sm:grid-cols-2 sm:gap-x-6">
              {trip.itinerary.days.map((d) => (
                <li key={d.id} className="border-b border-line">
                  <Link href={`/viaggi/${trip.id}/itinerario?giorno=${d.dayIndex + 1}`} className="group flex items-center gap-3 py-3">
                    <span className="flap flex h-8 min-w-8 items-center justify-center rounded-xs bg-ink px-1.5 text-sm tracking-[0.02em] text-board-text">G{d.dayIndex + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{d.title}</span>
                      <span className="block text-xs text-muted">
                        {formatDate(d.date, { weekday: true })} · {pluralize(d.activities.length, "attività", "attività")}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" weight="bold" />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="max-w-prose text-sm text-muted">Generiamo le giornate tenendo conto di voli, alloggio, orari di apertura e distanze. Poi lo modifichi come vuoi.</p>
          )}
        </Section>

        <Section icon={<Users className="h-5 w-5" />} title="Chi parte">
          <ul className="flex flex-wrap gap-2">
            {trip.travelers.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-sm border border-line bg-surface py-1 pl-1 pr-3 text-sm font-medium">
                <span className="flex h-7 w-7 items-center justify-center rounded-xs bg-ink text-xs font-bold text-board-text">{t.name.slice(0, 1).toUpperCase()}</span>
                {t.name}
                {t.isOwner && <span className="text-xs text-muted">(tu)</span>}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <aside className="space-y-8 lg:sticky lg:top-32 lg:self-start">
        <section aria-labelledby="budget-title" className={cn("board-panel p-5 text-board-text", level === "over" && "!border-danger")}>
          <div className="flex items-center justify-between">
            <h2 id="budget-title" className="text-lg font-bold [font-stretch:85%]">
              Budget a persona
            </h2>
            <Link href={`/viaggi/${trip.id}/budget`} className="text-sm font-semibold underline underline-offset-4 opacity-90 hoverable:hover:opacity-100">
              Dettagli
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
            <FlapText text={formatPrice(budget.perPerson).replace("\u00a0", "")} className="text-3xl" cellClassName={level === "warn" ? "!text-brand-500" : level === "over" ? "!text-[#ff6b6b]" : undefined} />
            {trip.budgetPerPerson && <p className="text-sm opacity-75">su {formatPrice(trip.budgetPerPerson)}</p>}
          </div>
          <div className="mt-4 space-y-3">
            <BudgetBar usage={budget.usage} />
            <BudgetStatus budget={budget} />
          </div>
          <div className="mt-4">
            <BudgetLines budget={budget} />
          </div>
        </section>
        <SuggestionList tripId={trip.id} compact canComparePrices={trip.flights.length > 0 || !!trip.stay} />
      </aside>
    </Container>
  );
}
