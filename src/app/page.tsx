import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarRange, Map, PiggyBank, Plane, Sparkles, Wand2 } from "lucide-react";
import { SearchWidget } from "@/components/search/search-widget";
import { PopularDestinations, PopularDestinationsSkeleton } from "@/components/home/popular-destinations";
import { CategoryChips } from "@/components/discovery/category-chips";
import { Footer } from "@/components/layout/footer";
import { LinkButton } from "@/components/ui/button";
import { Container, DemoDataBadge, SectionTitle } from "@/components/ui/misc";
import { CATEGORY_META } from "@/server/mock-data/destinations";
import { getSearchOptions } from "@/server/services/options";
import { usingMockData } from "@/server/providers";

const VIBES = [
  { label: "Weekend low cost", emoji: "🔥", href: "/cerca?month={m}&budget=300&travelers=2" },
  { label: "Mare con gli amici", emoji: "🏖️", href: "/ispirazione?categoria=mare" },
  { label: "Capitali da vivere di notte", emoji: "🎉", href: "/ispirazione?categoria=nightlife" },
  { label: "Natura e trekking", emoji: "🏔️", href: "/ispirazione?categoria=natura" },
  { label: "Sotto i 300 €", emoji: "💰", href: "/prezzi?max=300" },
];

const STEPS = [
  { icon: Sparkles, title: "Trova l'ispirazione", text: "Non sai dove andare? Dicci budget e periodo: ti proponiamo le mete che puoi permetterti." },
  { icon: Plane, title: "Confronta voli e alloggi", text: "Tutto in una pagina, ordinato per miglior rapporto qualità/prezzo. Niente dieci schede aperte." },
  { icon: Wand2, title: "Genera l'itinerario", text: "Giornate organizzate per zona, con orari di apertura, spostamenti e pause pranzo realistici." },
  { icon: Map, title: "Modificalo come vuoi", text: "Trascina le attività, cambia giorno, chiedi all'assistente. La mappa si aggiorna da sola." },
];

const FEATURES = [
  { icon: PiggyBank, title: "Budget sempre sotto controllo", text: "Previsto, speso, a persona e al giorno. Ti avvisiamo prima di sforare." },
  { icon: Wand2, title: "Travel optimizer", text: "\"Partendo un giorno prima risparmi 84 €\": suggerimenti concreti che applichi con un tocco." },
  { icon: Sparkles, title: "Assistente AI nel tuo viaggio", text: "\"Vorrei una giornata tranquilla\" o \"trovami qualcosa di più economico\": propone, tu decidi." },
  { icon: CalendarRange, title: "Tutto il gruppo, un solo piano", text: "Voli, alloggio, attività e costi per persona in un'unica panoramica." },
];

export default async function HomePage() {
  const options = await getSearchOptions();
  const nextMonth = (new Date().getMonth() + 1) % 12 + 1;
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-200/50 blur-3xl" />
          <div className="absolute -right-24 top-10 h-[22rem] w-[22rem] rounded-full bg-sun-300/40 blur-3xl" />
        </div>
        <Container className="pb-14 pt-10 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            {usingMockData && <DemoDataBadge className="mb-5" />}
            <h1 className="text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              Dove vuoi andare <span className="text-brand-500">questa volta?</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
              Trova la meta, confronta voli e alloggi e ottieni un itinerario su mappa. Tutto in un posto, pensato per chi viaggia spendendo poco.
            </p>
          </div>
          <div className="mx-auto mt-9 max-w-5xl animate-fade-up [animation-delay:80ms]">
            <SearchWidget origins={options.origins} destinations={options.destinations} defaults={{ from: options.homeAirport, month: nextMonth }} />
            <p className="mt-3 text-center text-sm text-muted">Puoi lasciare vuoti destinazione, date e budget: ci pensiamo noi.</p>
          </div>
        </Container>
      </section>

      {/* Destinazioni popolari */}
      <section className="py-10">
        <Container>
          <SectionTitle
            eyebrow="Il mese prossimo"
            title="Destinazioni popolari"
            description={`Voli A/R da ${options.homeAirport} per 4 notti: il prezzo compare dove è stato rilevato di recente.`}
            action={
              <Link href="/ispirazione" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                Vedi tutte <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <Suspense fallback={<PopularDestinationsSkeleton />}>
            <PopularDestinations from={options.homeAirport} />
          </Suspense>
        </Container>
      </section>

      {/* Trova il viaggio perfetto */}
      <section className="py-10">
        <Container>
          <div className="overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-white sm:px-12 sm:py-14">
            <p className="text-sm font-semibold text-sun-400">Non hai ancora deciso?</p>
            <h2 className="mt-2 max-w-xl text-3xl font-bold sm:text-4xl">Trova il viaggio perfetto, partendo da come ti senti.</h2>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {VIBES.map((v) => (
                <Link key={v.label} href={v.href.replace("{m}", String(nextMonth))} className="press flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur transition-colors duration-150 hoverable:hover:bg-white/20">
                  <span aria-hidden>{v.emoji}</span> {v.label}
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Categorie */}
      <section className="py-10">
        <Container>
          <SectionTitle eyebrow="Ispirazione" title="Esplora per categoria" />
          <CategoryChips hrefFor={(k) => `/ispirazione?categoria=${k}`} />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["mare", "cultura", "nightlife", "natura"] as const).map((k) => (
              <Link key={k} href={`/ispirazione?categoria=${k}`} className="press group rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-shadow duration-200 hoverable:hover:shadow-[var(--shadow-card)]">
                <span className="text-3xl" aria-hidden>{CATEGORY_META[k].emoji}</span>
                <p className="mt-3 font-display text-lg font-bold">{CATEGORY_META[k].label}</p>
                <p className="text-sm text-muted">{CATEGORY_META[k].description}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Come funziona */}
      <section className="py-14">
        <Container>
          <SectionTitle eyebrow="Come funziona" title="Dall'idea al viaggio in quattro passi" />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <s.icon className="h-6 w-6 text-brand-500" />
                  <span className="font-display text-4xl font-extrabold text-ink/10">{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Funzionalità */}
      <section className="py-10">
        <Container>
          <SectionTitle eyebrow="Perché TravelIo" title="Un solo travel assistant, non dieci siti" />
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA finale */}
      <section className="py-14">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-500 px-6 py-12 text-center text-white sm:py-16">
            <div aria-hidden className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-sun-400/40 blur-3xl" />
            <h2 className="relative text-3xl font-bold sm:text-5xl">Il tuo prossimo viaggio inizia qui.</h2>
            <p className="relative mx-auto mt-3 max-w-md text-white/85">Crea un viaggio, aggiungi chi parte con te e lascia che l&apos;itinerario si organizzi da solo.</p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <LinkButton href="/viaggi/nuovo" variant="sun" size="lg">
                + Crea viaggio
              </LinkButton>
              <LinkButton href="/ispirazione" size="lg" className="bg-white/15 text-white hoverable:hover:bg-white/25">
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
