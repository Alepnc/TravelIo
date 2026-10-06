import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarBlank, MagicWand, MapTrifold, PiggyBank, AirplaneTilt, Sparkle, Users } from "@phosphor-icons/react/dist/ssr";
import { SearchWidget } from "@/components/search/search-widget";
import { PopularDestinations, PopularDestinationsSkeleton } from "@/components/home/popular-destinations";
import { CATEGORY_ICON } from "@/components/discovery/category-icon";
import { MonthTabs } from "@/components/discovery/month-tabs";
import { CoverImage } from "@/components/ui/cover-image";
import { FlapText } from "@/components/ui/flap";
import { Footer } from "@/components/layout/footer";
import { LinkButton } from "@/components/ui/button";
import { Container, DemoDataBadge } from "@/components/ui/misc";
import { CATEGORY_META } from "@/server/mock-data/destinations";
import { listDestinations } from "@/server/services/discovery";
import { getSearchOptions } from "@/server/services/options";
import { usingMockData } from "@/server/providers";

const QUICK = [
  { label: "Weekend low cost", detail: "2 persone, 300 € a testa", icon: CATEGORY_ICON.weekend, href: "/cerca?from={from}&month={m}&budget=300&travelers=2" },
  { label: "Mare con gli amici", detail: "Spiagge e calette", icon: CATEGORY_ICON.mare, href: "/ispirazione?categoria=mare" },
  { label: "Capitali da vivere di notte", detail: "Club e locali fino all'alba", icon: CATEGORY_ICON.nightlife, href: "/ispirazione?categoria=nightlife" },
  { label: "Natura e trekking", detail: "Parchi, vulcani e sentieri", icon: CATEGORY_ICON.natura, href: "/ispirazione?categoria=natura" },
  { label: "Sotto i 300 €", detail: "Le mete più economiche del mese", icon: CATEGORY_ICON.economici, href: "/prezzi?max=300" },
];

const STEPS = [
  { icon: Sparkle, title: "Trova la meta", text: "Non sai dove andare? Dicci budget e periodo: ti proponiamo le mete che puoi permetterti." },
  { icon: AirplaneTilt, title: "Confronta voli e alloggi", text: "Tutto in una pagina, ordinato per miglior rapporto qualità/prezzo. Niente dieci schede aperte." },
  { icon: MagicWand, title: "Genera l'itinerario", text: "Giornate organizzate per zona, con orari di apertura, spostamenti e pause pranzo realistici." },
  { icon: MapTrifold, title: "Modificalo come vuoi", text: "Trascina le attività, cambia giorno, chiedi all'assistente. La mappa si aggiorna da sola." },
];

const FEATURES = [
  { icon: PiggyBank, title: "Budget sempre sotto controllo", text: "Previsto, speso, a persona e al giorno. Ti avvisiamo prima di sforare." },
  { icon: MagicWand, title: "Travel Optimizer", text: "\"Partendo un giorno prima risparmi 84 €\": suggerimenti concreti che applichi con un tocco." },
  { icon: Sparkle, title: "Assistente AI nel tuo viaggio", text: "\"Vorrei una giornata tranquilla\": propone le modifiche, tu decidi se applicarle." },
  { icon: Users, title: "Tutto il gruppo, un solo piano", text: "Voli, alloggio, attività e costi per persona in un'unica panoramica." },
];

const MOSAIC = ["mare", "cultura", "nightlife", "natura"] as const;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const options = await getSearchOptions();
  const nextMonth = ((new Date().getMonth() + 1) % 12) + 1;
  const month = Number(sp.mese) >= 1 && Number(sp.mese) <= 12 ? Number(sp.mese) : nextMonth;
  const from = options.homeAirport;
  const fromCity = options.origins.find((o) => o.value === from)?.label.replace(/\s*\(.*\)$/, "") ?? from;
  // Una foto diversa per categoria: la prima meta della categoria non ancora usata
  const used = new Set<string>();
  const mosaic = [] as { key: (typeof MOSAIC)[number]; dest?: Awaited<ReturnType<typeof listDestinations>>[number] }[];
  for (const k of MOSAIC) {
    const dest = (await listDestinations({ category: k })).find((d) => !used.has(d.id));
    if (dest) used.add(dest.id);
    mosaic.push({ key: k, dest });
  }
  const months = Array.from({ length: 6 }, (_, i) => ((nextMonth - 1 + i) % 12) + 1);

  return (
    <>
      {/* Il tabellone: ricerca e partenze dal tuo aeroporto */}
      <section className="border-t-[6px] border-board-frame bg-board pb-12 pt-8 text-board-text sm:pt-12">
        <Container>
          {usingMockData && <DemoDataBadge className="mb-4" />}
          <h1>
            <FlapText text={`Partenze da ${fromCity}`} className="text-[clamp(1.6rem,5.4vw,3.6rem)]" animateOnMount />
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-snug text-board-text/90">
            Dove vuoi andare questa volta? Prezzi veri dal tuo aeroporto, poi itinerario su mappa e budget, tutto in un solo viaggio.
          </p>

          <div className="mt-8">
            <SearchWidget origins={options.origins} destinations={options.destinations} defaults={{ from, month }} />
            <p className="mt-2.5 text-sm text-board-dim">Destinazione, date e budget si possono lasciare vuoti: ci pensiamo noi.</p>
          </div>

          <div className="mt-12">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-bold [font-stretch:80%] sm:text-2xl">Le mete del mese, A/R per 4 notti</h2>
              <MonthTabs month={month} months={months} hrefFor={(m) => `/?mese=${m}`} label="Mese del tabellone" />
            </div>
            <div className="board-panel px-3 py-2 sm:px-5">
              <Suspense fallback={<PopularDestinationsSkeleton />}>
                <PopularDestinations from={from} month={month} />
              </Suspense>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-board-dim">
              <p>Il prezzo compare dove è stato rilevato di recente da Google Flights; le altre mete si cercano con un clic.</p>
              <Link href="/prezzi" className="inline-flex items-center gap-1.5 font-semibold text-brand-500 underline-offset-4 hoverable:hover:underline">
                Tutte le mete per prezzo <ArrowRight className="h-4 w-4" weight="bold" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Categorie: un secondo tabellone, una riga per tipo di viaggio con la foto della meta */}
      <section className="pt-16 sm:pt-20">
        <Container>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="max-w-xl text-3xl font-bold leading-[1.05] [font-stretch:78%] sm:text-[2.75rem]">Che viaggio hai in mente?</h2>
            <Link href="/ispirazione" className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hoverable:hover:underline">
              Tutte le categorie <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
          </div>
          <div className="board-panel px-3 py-2 text-board-text sm:px-5">
            <ul>
              {mosaic.map(({ key, dest }) => {
                const Icon = CATEGORY_ICON[key];
                return (
                  <li key={key} className="border-b border-board-frame/70 last:border-b-0">
                    <Link href={`/ispirazione?categoria=${key}`} className="group grid grid-cols-[5.5rem_minmax(0,1fr)_1.25rem] items-center gap-x-4 py-3 transition-colors duration-150 hoverable:hover:bg-board-frame/60 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_1.25rem] sm:gap-x-6">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-board-cell">
                        {dest && <CoverImage src={dest.imageUrl} alt={`${dest.name}, ${dest.country}`} label={dest.name} sizes="144px" className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out)] hoverable:group-hover:scale-[1.04]" />}
                      </div>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-5 w-5 shrink-0 text-board-dim" aria-hidden />
                          <FlapText text={CATEGORY_META[key].label} length={9} className="text-[1.15rem] sm:text-[1.4rem]" />
                        </span>
                        <span className="mt-1.5 block text-sm text-board-dim sm:hidden">{CATEGORY_META[key].description}</span>
                      </span>
                      <span className="hidden text-sm text-board-dim sm:block">
                        {CATEGORY_META[key].description}
                        {dest && <span className="block text-board-text/80">In foto: {dest.name}, {dest.country}</span>}
                      </span>
                      <ArrowRight className="h-4 w-4 text-board-dim transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-brand-500" weight="bold" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Container>
      </section>

      {/* Ricerche pronte: righe grandi, si parte con un tocco */}
      <section className="pt-20 sm:pt-24">
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <h2 className="text-3xl font-bold leading-[1.05] [font-stretch:78%] sm:text-[2.75rem]">Non hai ancora deciso?</h2>
            <p className="mt-4 max-w-sm text-muted">Parti da come ti senti o da quanto vuoi spendere: la ricerca è già impostata dal tuo aeroporto.</p>
          </div>
          <ul className="border-t border-ink">
            {QUICK.map((q) => (
              <li key={q.label} className="border-b border-line">
                <Link href={q.href.replace("{m}", String(month)).replace("{from}", from)} className="group flex items-center gap-4 py-4 sm:py-5">
                  <q.icon className="h-6 w-6 shrink-0 text-ink-soft transition-colors duration-150 group-hover:text-ink" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-semibold leading-tight [font-stretch:82%] sm:text-2xl">{q.label}</span>
                    <span className="block text-sm text-muted">{q.detail}</span>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-ink/[0.06] transition-colors duration-150 group-hover:bg-brand-500">
                    <ArrowRight className="h-4 w-4" weight="bold" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Il viaggio come oggetto unico: un orario, una riga per capacità, e la partenza in fondo */}
      <section className="pt-20 sm:pt-28">
        <Container>
          <h2 className="max-w-3xl text-3xl font-bold leading-[1.05] [font-stretch:78%] sm:text-[3.25rem]">Un solo viaggio, non dieci siti aperti.</h2>
          <ol className="mt-10 border-t-2 border-ink">
            {[...STEPS, ...FEATURES].map((s) => (
              <li key={s.title} className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 border-b border-line py-5 sm:grid-cols-[3.5rem_minmax(0,16rem)_minmax(0,1fr)] sm:gap-x-8">
                <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-ink text-board-text">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="pt-1.5 text-lg font-bold leading-snug [font-stretch:85%] sm:text-xl">{s.title}</h3>
                <p className="col-start-2 mt-1 max-w-prose text-muted sm:col-start-3 sm:mt-0">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-lg">Crea un viaggio, aggiungi chi parte con te e lascia che l&apos;itinerario si organizzi da solo.</p>
            <div className="flex flex-wrap gap-2.5">
              <LinkButton href="/viaggi/nuovo" variant="secondary" size="lg" icon={<CalendarBlank className="h-5 w-5" />}>
                Crea viaggio
              </LinkButton>
              <LinkButton href="/ispirazione" variant="outline" size="lg">
                Cerca ispirazione
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
      <Footer />
    </>
  );
}
