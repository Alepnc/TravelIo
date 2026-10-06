import { DataSourceBadge } from "@/components/ui/data-source-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Bed as BedDouble, CalendarCheck, Clock, AirplaneTilt as Plane, Plus, MagnifyingGlass as Search, Sparkle as Sparkles, Ticket, Wallet } from "@phosphor-icons/react/dist/ssr";
import { CoverImage } from "@/components/ui/cover-image";
import { LinkButton } from "@/components/ui/button";
import { Card, Container, Skeleton } from "@/components/ui/misc";
import { FlapStatic, FlapText } from "@/components/ui/flap";
import { ACTIVITY_ICON } from "@/components/ui/category-icons";
import { CATEGORY_ICON as DEST_CATEGORY_ICON } from "@/components/discovery/category-icon";
import type { ActivityCategory } from "@/lib/types";
import { Footer } from "@/components/layout/footer";
import { CATEGORY_META } from "@/server/mock-data/destinations";
import { activities, maps } from "@/server/providers";
import { getDestination, quoteDestinations, representativeDates } from "@/server/services/discovery";
import { isLikelyBot } from "@/server/security/request";
import { getSearchOptions } from "@/server/services/options";
import { generateItinerary } from "@/lib/itinerary/generate";
import { formatPrice } from "@/lib/format";
import { addDays, formatDuration, monthName } from "@/lib/time";
import type { Destination } from "@/lib/types";
import { cn } from "@/lib/format";


function ActivityIcon({ category, large }: { category: ActivityCategory; large?: boolean }) {
  const Icon = ACTIVITY_ICON[category] ?? ACTIVITY_ICON.altro;
  return <Icon className={cn("shrink-0 text-ink-soft", large ? "mt-0.5 h-6 w-6" : "mt-0.5 h-4 w-4")} aria-hidden />;
}

export async function generateMetadata({ params }: PageProps<"/destinazioni/[slug]">): Promise<Metadata> {
  const d = await getDestination((await params).slug);
  if (!d) return { title: "Destinazione non trovata" };
  return {
    title: `${d.name}: cosa vedere, quando andare e quanto costa`,
    description: `${d.tagline}. ${d.description}`,
    openGraph: { images: [{ url: `${d.imageUrl}?w=1200&q=70&auto=format` }] },
  };
}

async function Prices({ d, from }: { d: Destination; from: string }) {
  const month = d.bestMonths.find((m) => m > new Date().getMonth() + 1) ?? d.bestMonths[0];
  const { depart, ret } = representativeDates(month, 4);
  // Al massimo una ricerca (A/R), e solo se il prezzo non è già noto; nessuna per i crawler: il prezzo si legge dalla cache se già rilevato
  const { quotes, error } = await quoteDestinations([d], { from, depart, ret, ensureKnown: (await isLikelyBot()) ? 0 : 1 });
  const q = quotes[0];
  const rows = [
    { icon: Plane, label: `Volo A/R da ${from}`, value: q.flightStatus === "live" ? formatPrice(q.flightPrice!) : "da rilevare", real: true },
    { icon: BedDouble, label: "Alloggio, 4 notti", value: `~${formatPrice(q.stayEstimate)}`, real: false },
    { icon: Wallet, label: "Cibo e trasporti locali", value: `~${formatPrice(q.dailyEstimate)}`, real: false },
  ];
  return (
    <div className="board-panel p-5 text-board-text">
      <h2 className="text-lg font-bold [font-stretch:85%]">Quanto costa a persona</h2>
      <p className="text-sm text-board-dim">{monthName(month)}, 4 notti</p>
      {q.flightStatus === "live" ? (
        <div className="mt-3">
          <p className="text-sm text-board-dim">Volo A/R da</p>
          <FlapStatic text={formatPrice(q.flightPrice!).replace("\u00a0", "")} className="mt-1 text-3xl" cellClassName="!text-brand-500" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-board-dim">{error ?? "Il prezzo del volo si rileva con la ricerca."}</p>
      )}
      <ul className="mt-5 divide-y divide-board-frame border-y border-board-frame">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="flex items-center gap-2">
              <r.icon className="h-4 w-4 text-board-dim" /> {r.label}
              {!r.real && <span className="col-label rounded-sm border border-board-dim/40 px-1 text-[10px] text-board-dim">stima</span>}
            </span>
            <span className="tabular font-semibold">{r.value}</span>
          </li>
        ))}
      </ul>
      <DataSourceBadge live={q.flightStatus === "live"} onBoard className="mt-4" />
      <div className="mt-5 grid gap-2">
        <LinkButton href={`/viaggi/nuovo?to=${d.id}&depart=${depart}&ret=${ret}`} variant="secondary" icon={<Plus className="h-4 w-4" />}>
          Crea viaggio
        </LinkButton>
        <LinkButton href={`/cerca?from=${from}&to=${d.id}&depart=${depart}&ret=${ret}&travelers=2`} variant="outline" className="border-board-dim/50 bg-transparent text-board-text hoverable:hover:border-board-text" icon={<Search className="h-4 w-4" />}>
          Cerca voli e alloggi reali
        </LinkButton>
      </div>
    </div>
  );
}

function StaysCta({ d, from }: { d: Destination; from: string }) {
  const { depart, ret } = representativeDates(d.bestMonths[0], 4);
  return (
    <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-prose text-sm text-ink-soft">I prezzi degli alloggi dipendono dalle date: scegli quando vai e li confronti con i venditori.</p>
      <LinkButton href={`/cerca?from=${from}&to=${d.id}&depart=${depart}&ret=${ret}&travelers=2&tab=alloggi`} variant="outline" size="sm" icon={<Search className="h-4 w-4" />}>
        Cerca alloggi
      </LinkButton>
    </Card>
  );
}

async function SampleItinerary({ d }: { d: Destination }) {
  const pois = await activities.listForDestination(d.id);
  const { depart } = representativeDates(d.bestMonths[0], 2);
  const days = generateItinerary({
    destinationName: d.name, center: d.location, startDate: depart, endDate: addDays(depart, 2),
    pois, pace: "bilanciato", mealCost: Math.round(d.dailyCost * 0.35), travel: (a, b) => maps.estimate(a, b), hotel: null,
  });
  return (
    <div className="grid gap-x-8 gap-y-8 md:grid-cols-3">
      {days.map((day) => (
        <div key={day.dayIndex} className="border-t-2 border-ink pt-3">
          <FlapStatic text={`Giorno ${day.dayIndex + 1}`} className="text-sm" />
          <h3 className="mt-2 font-bold">{day.title}</h3>
          <ul className="mt-3 divide-y divide-line">
            {day.activities
              .filter((a) => a.category !== "alloggio")
              .map((a, i) => (
                <li key={i} className="flex gap-3 py-2 text-sm">
                  <span className="tabular w-11 shrink-0 font-semibold text-ink-soft">{a.startTime}</span>
                  <ActivityIcon category={a.category} />
                  <span>{a.title}</span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default async function DestinationPage({ params }: PageProps<"/destinazioni/[slug]">) {
  const d = await getDestination((await params).slug);
  if (!d) notFound();
  const [pois, options] = await Promise.all([activities.listForDestination(d.id), getSearchOptions()]);
  const sights = pois.filter((p) => p.category !== "ristorante").sort((a, b) => b.popularity - a.popularity);

  return (
    <>
      <section className="bg-board text-board-text">
        <Container className="grid gap-8 py-8 sm:py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
          <div>
            <h1 className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <FlapText text={d.name} className="text-[clamp(2rem,6vw,3.75rem)]" animateOnMount />
              <FlapText text={d.airportCode} className="text-[clamp(1.1rem,2.6vw,1.6rem)]" cellClassName="!text-board-dim" />
            </h1>
            <p className="mt-3 text-board-dim">{d.country}</p>
            <p className="mt-4 max-w-md text-lg text-board-text/90">{d.tagline}</p>
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {d.categories.map((c) => {
                const Icon = DEST_CATEGORY_ICON[c];
                return (
                  <li key={c} className="flex items-center gap-1.5 rounded-sm bg-board-cell px-2.5 py-1.5 text-sm font-semibold">
                    {Icon && <Icon className="h-4 w-4 text-brand-500" aria-hidden />} {CATEGORY_META[c].label}
                  </li>
                );
              })}
            </ul>
          </div>
          <CoverImage src={d.imageUrl} alt={`${d.name}, ${d.country}`} label={d.name} sizes="(min-width: 1024px) 720px, 100vw" priority className="aspect-[16/10] w-full rounded-md" />
        </Container>
      </section>

      <Container className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          <section>
            <h2 className="text-3xl font-bold [font-stretch:80%]">Perché visitarla</h2>
            <p className="mt-3 max-w-prose text-lg text-ink-soft">{d.description}</p>
            <ul className="mt-5 grid gap-x-6 border-t border-line sm:grid-cols-2">
              {d.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2.5 border-b border-line py-2.5 text-sm font-semibold">
                  <span className="h-1.5 w-1.5 shrink-0 bg-brand-500" aria-hidden />
                  {h}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2.5 text-3xl font-bold [font-stretch:80%]">
              <CalendarCheck className="h-7 w-7" /> Quando andare
            </h2>
            <p className="mt-2 text-muted">Clima {d.climate}. I mesi evidenziati offrono il miglior equilibrio tra meteo, folla e prezzi.</p>
            <div className="board-panel mt-4 grid grid-cols-6 gap-1 p-1.5 sm:grid-cols-12">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const good = d.bestMonths.includes(m);
                return (
                  <div key={m} className={cn("flap rounded-xs py-3 text-center text-sm", good ? "bg-board-frame text-board-text shadow-[inset_0_-3px_0_var(--color-brand-500)]" : "bg-board-cell text-board-dim/60")} title={good ? "Periodo consigliato" : undefined}>
                    {monthName(m, true)}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2.5 text-3xl font-bold [font-stretch:80%]">
              <Ticket className="h-7 w-7" /> Attrazioni e attività
            </h2>
            <ul className="mt-4 grid gap-x-8 border-t border-line sm:grid-cols-2">
              {sights.map((p) => (
                <li key={p.id} className="flex gap-3 border-b border-line py-4">
                  <ActivityIcon category={p.category} large />
                  <div className="min-w-0">
                    <p className="font-semibold">{p.name}</p>
                    <p className="line-clamp-2 text-sm text-muted">{p.description}</p>
                    <p className="mt-1.5 flex items-center gap-3 text-xs font-medium text-ink-soft">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDuration(p.durationMin)}</span>
                      <span>{p.cost ? formatPrice(p.cost) : "Gratis"}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2.5 text-3xl font-bold [font-stretch:80%]">
              <Sparkles className="h-7 w-7" /> Itinerario consigliato: 3 giorni
            </h2>
            <p className="mt-2 text-muted">Generato automaticamente raggruppando le tappe per zona. Creando il viaggio puoi personalizzarlo.</p>
            <div className="mt-4">
              <Suspense fallback={<Skeleton className="h-64" />}>
                <SampleItinerary d={d} />
              </Suspense>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2.5 text-3xl font-bold [font-stretch:80%]">
                <BedDouble className="h-7 w-7" /> Dove dormire
              </h2>
            </div>
            <div className="mt-4">
              <StaysCta d={d} from={options.homeAirport} />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <Prices d={d} from={options.homeAirport} />
          </Suspense>
          <p className="mt-3 text-xs text-muted">
            Il volo è un prezzo reale, il resto una stima. <Link href="/prezzi" className="underline">Confronta altre mete</Link>
          </p>
        </aside>
      </Container>
      <Footer />
    </>
  );
}
