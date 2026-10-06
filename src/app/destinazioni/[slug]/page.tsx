import { DataSourceBadge } from "@/components/ui/data-source-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BedDouble, CalendarCheck, Clock, Plane, Plus, Search, Sparkles, Ticket, Wallet } from "lucide-react";
import { CoverImage } from "@/components/ui/cover-image";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, Container, Skeleton } from "@/components/ui/misc";
import { Footer } from "@/components/layout/footer";
import { CATEGORY_META } from "@/server/mock-data/destinations";
import { activities, maps } from "@/server/providers";
import { getDestination, quoteDestinations, representativeDates } from "@/server/services/discovery";
import { isLikelyBot } from "@/server/security/request";
import { getSearchOptions } from "@/server/services/options";
import { generateItinerary } from "@/lib/itinerary/generate";
import { flagEmoji, formatPrice } from "@/lib/format";
import { addDays, formatDuration, monthName } from "@/lib/time";
import type { Destination } from "@/lib/types";
import { cn } from "@/lib/format";

const CATEGORY_ICON: Record<string, string> = {
  attrazione: "🏛️", museo: "🖼️", natura: "🌿", shopping: "🛍️", esperienza: "✨", ristorante: "🍽️", nightlife: "🍸",
};

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
    { icon: Plane, label: `Volo A/R da ${from}`, value: q.flightStatus === "live" ? formatPrice(q.flightPrice!) : "—", real: true },
    { icon: BedDouble, label: "Alloggio, 4 notti", value: `~${formatPrice(q.stayEstimate)}`, real: false },
    { icon: Wallet, label: "Cibo e trasporti locali", value: `~${formatPrice(q.dailyEstimate)}`, real: false },
  ];
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-muted">A persona · {monthName(month)}, 4 notti</p>
      {q.flightStatus === "live" ? (
        <p className="mt-1 font-display text-4xl font-extrabold">
          <span className="text-base font-semibold text-muted">volo da </span>
          {formatPrice(q.flightPrice!)}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">{error ?? "Il prezzo del volo si rileva con la ricerca."}</p>
      )}
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink-soft">
              <r.icon className="h-4 w-4 text-muted" /> {r.label}
              {!r.real && <span className="rounded bg-ink/5 px-1.5 text-[10px] font-semibold uppercase text-muted">stima</span>}
            </span>
            <span className="font-semibold tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 grid gap-2">
        <LinkButton href={`/viaggi/nuovo?to=${d.id}&depart=${depart}&ret=${ret}`} variant="secondary" icon={<Plus className="h-4 w-4" />}>
          Crea viaggio
        </LinkButton>
        <LinkButton href={`/cerca?from=${from}&to=${d.id}&depart=${depart}&ret=${ret}&travelers=2`} variant="outline" icon={<Search className="h-4 w-4" />}>
          Cerca voli e alloggi reali
        </LinkButton>
      </div>
    </Card>
  );
}

function StaysCta({ d, from }: { d: Destination; from: string }) {
  const { depart, ret } = representativeDates(d.bestMonths[0], 4);
  return (
    <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-soft">I prezzi degli alloggi dipendono dalle date: scegli quando vai e li confronti con i venditori.</p>
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
    <div className="grid gap-4 md:grid-cols-3">
      {days.map((day) => (
        <Card key={day.dayIndex} className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Giorno {day.dayIndex + 1}</p>
          <h3 className="mt-1 font-bold">{day.title}</h3>
          <ul className="mt-3 space-y-2">
            {day.activities
              .filter((a) => a.category !== "alloggio")
              .map((a, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-11 shrink-0 font-semibold tabular-nums text-muted">{a.startTime}</span>
                  <span>
                    {CATEGORY_ICON[a.category] ?? "📍"} {a.title}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
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
      <section className="relative">
        <CoverImage src={d.imageUrl} alt={`${d.name}, ${d.country}`} sizes="100vw" priority className="h-[52vh] min-h-80 w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <Container className="absolute inset-x-0 bottom-0 pb-8 text-white">
          <p className="font-medium text-white/85">
            {flagEmoji(d.countryCode)} {d.country}
          </p>
          <h1 className="text-5xl font-extrabold sm:text-7xl">{d.name}</h1>
          <p className="mt-1 text-lg text-white/90">{d.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.categories.map((c) => (
              <span key={c} className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <Container className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-12">
          <section>
            <h2 className="text-2xl font-bold">Perché visitarla</h2>
            <p className="mt-3 text-lg text-ink-soft">{d.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.highlights.map((h) => (
                <Badge key={h} tone="brand" className="px-3 py-1 text-sm">
                  {h}
                </Badge>
              ))}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <CalendarCheck className="h-6 w-6 text-brand-500" /> Quando andare
            </h2>
            <p className="mt-2 text-muted">Clima {d.climate}. I mesi evidenziati offrono il miglior equilibrio tra meteo, folla e prezzi.</p>
            <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const good = d.bestMonths.includes(m);
                return (
                  <div key={m} className={cn("rounded-xl py-3 text-center text-sm font-semibold", good ? "bg-brand-500 text-white" : "bg-ink/5 text-muted")} title={good ? "Periodo consigliato" : undefined}>
                    {monthName(m, true)}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Ticket className="h-6 w-6 text-brand-500" /> Attrazioni e attività
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {sights.map((p) => (
                <li key={p.id} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
                  <span className="text-2xl" aria-hidden>{CATEGORY_ICON[p.category] ?? "📍"}</span>
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
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-6 w-6 text-brand-500" /> Itinerario consigliato: 3 giorni
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
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <BedDouble className="h-6 w-6 text-brand-500" /> Dove dormire
              </h2>
              <DataSourceBadge />
            </div>
            <div className="mt-4">
              <StaysCta d={d} from={options.homeAirport} />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={<Skeleton className="h-80" />}>
            <Prices d={d} from={options.homeAirport} />
          </Suspense>
          <p className="mt-3 text-center text-xs text-muted">
            Il volo è un prezzo reale, il resto una stima. <Link href="/prezzi" className="underline">Confronta altre mete</Link>
          </p>
        </aside>
      </Container>
      <Footer />
    </>
  );
}
