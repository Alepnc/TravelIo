import "server-only";
import type { Destination, DestinationCategory } from "@/lib/types";
import { addDays, diffDays, parseISODate, todayISO, toISODate } from "@/lib/time";
import { destinations, flights } from "@/server/providers";
import { ProviderError } from "@/server/providers/errors";

export function listDestinations(filter?: { category?: DestinationCategory; month?: number; q?: string }) {
  return destinations.list(filter);
}

export function getDestination(id: string) {
  return destinations.get(id);
}

/** Prima data utile nel mese richiesto (giovedì dopo il 10), nel futuro */
export function representativeDates(month: number, nights: number): { depart: string; ret: string } {
  const today = parseISODate(todayISO());
  let year = today.getUTCFullYear();
  if (month < today.getUTCMonth() + 1 || (month === today.getUTCMonth() + 1 && today.getUTCDate() > 10)) year += 1;
  const d = new Date(Date.UTC(year, month - 1, 10));
  while (d.getUTCDay() !== 4) d.setUTCDate(d.getUTCDate() + 1);
  const depart = toISODate(d);
  return { depart, ret: addDays(depart, nights) };
}

/**
 * Prezzo di una meta per le pagine di scoperta.
 *
 * - `flightPrice` è REALE (volo A/R più economico trovato dal provider, per persona).
 * - alloggio e spese sono STIME di catalogo (mai offerte): la UI le etichetta come tali.
 */
export interface DestinationQuote {
  destination: Destination;
  flightPrice: number | null;
  /** live = rilevato; none = nessun volo per quelle date; pending = non ancora rilevato (quota/pagina) */
  flightStatus: "live" | "none" | "pending";
  fetchedAt?: string;
  stayEstimate: number;
  dailyEstimate: number;
  /** Volo reale + stime; null finché il volo non è noto */
  totalEstimate: number | null;
  departDate: string;
  returnDate: string;
  withinBudget: boolean | null;
}

export interface QuoteBatch {
  quotes: DestinationQuote[];
  /** Primo errore del provider (chiave mancante, quota, servizio giù): mostrato una volta sola */
  error?: string;
  /** Ricerche effettivamente inviate al provider in questa richiesta */
  fetched: number;
}

const CONCURRENCY = 3;

/**
 * Quota i prezzi del volo per un elenco di mete, in ordine di priorità.
 *
 * Legge prima ciò che è già in cache (gratis); poi rileva prezzi nuovi SOLO finché i prezzi noti sono meno di
 * `ensureKnown`. Così una pagina garantisce "almeno N prezzi" ma ricaricarla non spende altra quota:
 * le pagine pubbliche non possono esaurire il piano del provider semplicemente navigando.
 */
export async function quoteDestinations(
  list: Destination[],
  opts: { from: string; depart: string; ret: string; budget?: number; ensureKnown: number },
): Promise<QuoteBatch> {
  const nights = Math.max(1, diffDays(opts.depart, opts.ret));
  const quotes: DestinationQuote[] = list.map((destination) => ({
    destination,
    flightPrice: null,
    flightStatus: "pending",
    stayEstimate: Math.round((destination.avgNightlyPrice * nights) / 2),
    dailyEstimate: destination.dailyCost * (nights + 1),
    totalEstimate: null,
    departDate: opts.depart,
    returnDate: opts.ret,
    withinBudget: null,
  }));

  let error: string | undefined;
  let fetched = 0;

  const apply = (q: DestinationQuote, r: Awaited<ReturnType<typeof flights.quoteRoundTrip>>) => {
    if (r.status === "hit") {
      q.flightPrice = r.price;
      q.flightStatus = "live";
      q.fetchedAt = r.fetchedAt;
      q.totalEstimate = r.price + q.stayEstimate + q.dailyEstimate;
      q.withinBudget = opts.budget ? q.totalEstimate <= opts.budget : null;
    } else if (r.status === "none") q.flightStatus = "none";
  };

  const query = (q: DestinationQuote) => ({ from: opts.from, to: q.destination.airportCode, depart: opts.depart, ret: opts.ret });

  // 1) Solo cache, gratis
  for (const q of quotes) {
    if (q.destination.airportCode === opts.from) {
      q.flightStatus = "none";
      continue;
    }
    try {
      apply(q, await flights.quoteRoundTrip(query(q), { cacheOnly: true }));
    } catch (e) {
      if (e instanceof ProviderError) error ??= e.message;
      else throw e;
    }
  }

  // 2) Rilevazione di nuovi prezzi, solo per raggiungere il minimo richiesto
  const known = quotes.filter((q) => q.flightStatus === "live").length;
  const missing = quotes.filter((q) => q.flightStatus === "pending").slice(0, Math.max(0, opts.ensureKnown - known));
  for (let i = 0; i < missing.length && !error; i += CONCURRENCY) {
    await Promise.all(
      missing.slice(i, i + CONCURRENCY).map(async (q) => {
        try {
          apply(q, await flights.quoteRoundTrip(query(q), { cacheOnly: false }));
          fetched++;
        } catch (e) {
          if (e instanceof ProviderError) error ??= e.message;
          else throw e;
        }
      }),
    );
  }
  return { quotes, error, fetched };
}

/** Ordine per le liste: prima le mete con prezzo noto (nel budget, di stagione, più economiche), poi le altre. */
export function sortQuotes(quotes: DestinationQuote[], month?: number): DestinationQuote[] {
  const rank = (q: DestinationQuote) => (q.flightStatus === "live" ? (q.withinBudget === false ? 1 : 0) : q.flightStatus === "pending" ? 2 : 3);
  const inSeason = (q: DestinationQuote) => (month && q.destination.bestMonths.includes(month) ? 0 : 1);
  return [...quotes].sort((a, b) => rank(a) - rank(b) || inSeason(a) - inSeason(b) || (a.totalEstimate ?? 0) - (b.totalEstimate ?? 0));
}

/**
 * Ordine di rilevazione dei prezzi: mete di stagione e più economiche per costi di catalogo,
 * così le poche ricerche disponibili vanno dove è più probabile che il budget regga.
 */
export function prioritizeDestinations(list: Destination[], month?: number): Destination[] {
  const rough = (d: Destination) => d.avgNightlyPrice / 2 + d.dailyCost;
  const inSeason = (d: Destination) => (month && d.bestMonths.includes(month) ? 0 : 1);
  return [...list].sort((a, b) => inSeason(a) - inSeason(b) || rough(a) - rough(b) || a.id.localeCompare(b.id));
}

/** Ricerca flessibile: "da Napoli, ovunque, ad agosto, 500 €" */
export async function suggestDestinations(opts: {
  from: string;
  month?: number;
  depart?: string;
  ret?: string;
  travelers: number;
  budget?: number;
  category?: DestinationCategory;
  /** Quanti prezzi reali devono risultare noti (i mancanti si rilevano, una ricerca ciascuno) */
  ensureKnown: number;
}): Promise<QuoteBatch> {
  const month = opts.month ?? (opts.depart ? parseISODate(opts.depart).getUTCMonth() + 1 : undefined);
  const dates = opts.depart && opts.ret ? { depart: opts.depart, ret: opts.ret } : representativeDates(month ?? parseISODate(todayISO()).getUTCMonth() + 2, 4);
  const list = await destinations.list({ category: opts.category });

  const ordered = prioritizeDestinations(list, month);
  const batch = await quoteDestinations(ordered, { from: opts.from, ...dates, budget: opts.budget, ensureKnown: opts.ensureKnown });
  return { ...batch, quotes: sortQuotes(batch.quotes, month).filter((q) => q.flightStatus !== "none") };
}
