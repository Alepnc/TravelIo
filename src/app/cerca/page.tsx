import { DataSourceBadge } from "@/components/ui/data-source-badge";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowRight, CalendarDots as CalendarDays, Users } from "@phosphor-icons/react/dist/ssr";
import { FlapText } from "@/components/ui/flap";
import { SearchWidget } from "@/components/search/search-widget";
import { SearchResults, type Loaded } from "@/components/search/search-results";
import { DestinationSuggestions } from "@/components/discovery/suggestions";
import { DraftBar } from "@/components/draft/draft-bar";
import { FlightCardSkeleton } from "@/components/flights/flight-card";
import { Container, ErrorState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { searchQuerySchema } from "@/lib/validation";
import { fieldErrors } from "@/lib/validation";
import { formatPrice, pluralize } from "@/lib/format";
import { diffDays, formatDateRange, monthName } from "@/lib/time";
import { getDestination, representativeDates, suggestDestinations } from "@/server/services/discovery";
import { getSearchOptions } from "@/server/services/options";
import { forClient, searchAccommodations, searchFlights } from "@/server/services/search";
import { getCurrentUser } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";
import { clientIp, isLikelyBot } from "@/server/security/request";
import { getOwnedTripRow } from "@/server/services/ownership";

export const metadata: Metadata = { title: "Cerca voli, alloggi e mete" };

async function load<T>(p: Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await p };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Servizio non disponibile" };
  }
}

async function PreciseResults(props: { from: string; to: string; depart: string; ret: string; travelers: number; budget?: number; tripId?: string; tab?: "voli" | "alloggi" }) {
  const dest = (await getDestination(props.to))!;
  // Ogni ricerca nuova usa quota del provider: niente crawler e un limite per IP
  if (await isLikelyBot()) return <ErrorState title="Ricerca non disponibile" description="I prezzi in tempo reale non vengono mostrati ai crawler." />;
  const limit = rateLimit(`page-search:${await clientIp()}`, 15, 10 * 60_000);
  if (!limit.ok) return <ErrorState title="Troppe ricerche ravvicinate" description={`Riprova tra ${Math.ceil(limit.retryAfterSec / 60)} minuti.`} />;
  const [outbound, inbound, stays] = await Promise.all([
    load(searchFlights(props.from, dest.airportCode, props.depart, props.travelers).then(forClient)),
    load(searchFlights(dest.airportCode, props.from, props.ret, props.travelers).then(forClient)),
    load(searchAccommodations(dest.id, props.depart, props.ret, props.travelers).then(forClient)),
  ]);
  return (
    <SearchResults
      search={{ from: props.from, to: dest.id, depart: props.depart, ret: props.ret, travelers: props.travelers, budget: props.budget }}
      destinationName={dest.name}
      outbound={outbound}
      inbound={inbound}
      stays={stays}
      tripId={props.tripId}
      initialTab={props.tab}
    />
  );
}

async function FlexibleResults(props: { from: string; month?: number; depart?: string; ret?: string; travelers: number; budget?: number; scan: number; moreHref: string }) {
  const bot = await isLikelyBot();
  const batch = await suggestDestinations({ from: props.from, month: props.month, depart: props.depart, ret: props.ret, travelers: props.travelers, budget: props.budget, ensureKnown: bot ? 0 : props.scan });
  return <DestinationSuggestions batch={batch} from={props.from} travelers={props.travelers} budget={props.budget} month={props.month} moreHref={props.moreHref} />;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-11 w-48" />
      {Array.from({ length: 4 }, (_, i) => (
        <FlightCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/cerca">) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = searchQuerySchema.safeParse(flat);
  const options = await getSearchOptions();

  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return (
      <Container className="py-10">
        <ErrorState title="Ricerca non valida" description={Object.values(errors).join(". ")} action={<LinkButton href="/cerca" variant="outline">Nuova ricerca</LinkButton>} />
      </Container>
    );
  }

  const q = parsed.data;
  const from = q.from ?? options.homeAirport;
  const dest = q.to ? await getDestination(q.to) : null;
  if (q.to && !dest) {
    return (
      <Container className="py-10">
        <ErrorState title="Destinazione non trovata" description={`Non conosciamo ancora "${q.to}". Prova con una delle mete disponibili.`} action={<LinkButton href="/ispirazione" variant="outline">Sfoglia le mete</LinkButton>} />
      </Container>
    );
  }

  // Destinazione precisa senza date: proponiamo date indicative nel mese scelto (o nel migliore)
  const suggested = dest && (!q.depart || !q.ret) ? representativeDates(q.month ?? dest.bestMonths.find((m) => m > new Date().getMonth() + 1) ?? dest.bestMonths[0], 4) : null;
  const depart = q.depart ?? suggested?.depart;
  const ret = q.ret ?? suggested?.ret;

  const user = await getCurrentUser();
  let tripId: string | undefined;
  if (typeof raw.trip === "string" && user) {
    try {
      tripId = (await getOwnedTripRow(user.id, raw.trip)).id;
    } catch {
      tripId = undefined;
    }
  }
  const tab = raw.tab === "alloggi" ? "alloggi" : "voli";
  // Quanti prezzi reali garantire (una ricerca per ognuno mancante): 6 di default, 12 su richiesta
  const scan = Math.min(12, Math.max(6, Number(flat.n) || 6));
  const moreParams = new URLSearchParams(Object.entries(flat).filter(([k]) => k !== "n") as [string, string][]);
  moreParams.set("n", "12");
  const moreHref = `/cerca?${moreParams}`;

  return (
    <div className="pb-32">
      <div className="bg-board text-board-text">
        <Container className="pb-8 pt-5">
          <SearchWidget compact origins={options.origins} destinations={options.destinations} defaults={{ from, to: q.to, depart: q.depart ?? depart, ret: q.ret ?? ret, month: q.month, travelers: q.travelers, budget: q.budget }} />
          <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[clamp(1.4rem,4vw,2.4rem)]">
              {dest ? (
                <>
                  <FlapText text={from} />
                  <ArrowRight className="h-[0.8em] w-[0.8em] text-brand-500" weight="bold" aria-label="verso" />
                  <FlapText text={dest.name} />
                </>
              ) : (
                <FlapText text="Dove puoi andare" />
              )}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-board-dim">
              {dest && depart && ret ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" /> {formatDateRange(depart, ret)} · {pluralize(diffDays(depart, ret), "notte", "notti")}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" /> {q.month ? monthName(q.month) : "Prossime settimane"}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {pluralize(q.travelers, "viaggiatore", "viaggiatori")}
              </span>
              {q.budget && <span>Budget {formatPrice(q.budget)} a persona</span>}
            </p>
            {suggested && <p className="mt-2 text-sm font-medium text-brand-500">Ti mostriamo date indicative nel periodo migliore: cambiale quando vuoi.</p>}
          </div>
          <DataSourceBadge onBoard live={!!dest} />
          </div>
        </Container>
      </div>
      <Container className="pt-8">

        {dest && depart && ret ? (
          <Suspense key={`${from}-${dest.id}-${depart}-${ret}-${q.travelers}`} fallback={<ResultsSkeleton />}>
            <PreciseResults from={from} to={dest.id} depart={depart} ret={ret} travelers={q.travelers} budget={q.budget} tripId={tripId} tab={tab} />
          </Suspense>
        ) : (
          <Suspense key={`${from}-${q.month}-${q.budget}-${q.travelers}-${scan}`} fallback={<ResultsSkeleton />}>
            <FlexibleResults from={from} month={q.month} depart={q.depart} ret={q.ret} travelers={q.travelers} budget={q.budget} scan={scan} moreHref={moreHref} />
          </Suspense>
        )}
      </Container>
      {!tripId && <DraftBar />}
    </div>
  );
}
