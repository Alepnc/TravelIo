import Link from "next/link";
import { CalendarDays, Plane, Search } from "lucide-react";
import type { DestinationQuote, QuoteBatch } from "@/server/services/discovery";
import { CoverImage } from "@/components/ui/cover-image";
import { Badge, EmptyState, ErrorState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { flagEmoji, formatPrice } from "@/lib/format";
import { formatDate, monthName } from "@/lib/time";
import { QuoteBreakdown } from "./quote-breakdown";

function QuoteCard({ q, i, href, month }: { q: DestinationQuote; i: number; href: string; month?: number }) {
  const d = q.destination;
  return (
    <li className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
      <Link href={href} className="group flex gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-3 transition-shadow duration-200 hoverable:hover:shadow-[var(--shadow-card)]">
        <CoverImage src={d.imageUrl} alt={d.name} label={d.name.slice(0, 1)} sizes="128px" className="h-28 w-28 shrink-0 rounded-2xl sm:h-32 sm:w-36" />
        <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">
                {flagEmoji(d.countryCode)} {d.country}
              </p>
              <h3 className="truncate text-xl font-bold">{d.name}</h3>
            </div>
            {q.flightStatus === "live" && (
              <div className="text-right">
                <p className="font-display text-2xl font-extrabold leading-none">{formatPrice(q.flightPrice!)}</p>
                <p className="text-[11px] text-muted">volo A/R a persona</p>
              </div>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-ink-soft">{d.tagline}</p>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted">
            <QuoteBreakdown quote={q} className="w-full" />
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDate(q.departDate)} → {formatDate(q.returnDate)}
            </span>
            {month && d.bestMonths.includes(month) && <Badge tone="success">Ottimo a {monthName(month).toLowerCase()}</Badge>}
          </div>
        </div>
      </Link>
    </li>
  );
}

export function DestinationSuggestions({ batch, from, travelers, budget, month, moreHref }: { batch: QuoteBatch; from: string; travelers: number; budget?: number; month?: number; moreHref: string }) {
  const hrefFor = (q: DestinationQuote) => `/cerca?from=${from}&to=${q.destination.id}&depart=${q.departDate}&ret=${q.returnDate}&travelers=${travelers}${budget ? `&budget=${budget}` : ""}`;
  const live = batch.quotes.filter((q) => q.flightStatus === "live");
  const within = live.filter((q) => q.withinBudget !== false);
  const over = live.filter((q) => q.withinBudget === false);
  const pending = batch.quotes.filter((q) => q.flightStatus === "pending");

  if (!batch.quotes.length)
    return <EmptyState icon={<Plane className="h-6 w-6" />} title="Nessuna meta raggiungibile" description="Da questo aeroporto non troviamo voli nel periodo scelto. Prova un altro aeroporto o un altro mese." />;

  return (
    <div className="space-y-8">
      {batch.error && <ErrorState title="Prezzi reali non disponibili" description={batch.error} />}
      {budget && live.length > 0 && within.length === 0 && (
        <div className="rounded-2xl border border-sun-400/60 bg-sun-100 p-4 text-sm">
          Con {formatPrice(budget)} a persona nessuna delle mete controllate rientra del tutto nel budget (volo reale + stima di alloggio e spese). Ecco le più vicine.
        </div>
      )}
      {live.length > 0 && <ul className="grid gap-3 lg:grid-cols-2">{(budget && within.length ? within : live).map((q, i) => <QuoteCard key={q.destination.id} q={q} i={i} href={hrefFor(q)} month={month} />)}</ul>}
      {budget && within.length > 0 && over.length > 0 && (
        <details>
          <summary className="cursor-pointer list-none text-sm font-semibold text-brand-600">Mostra {over.length} mete oltre il budget</summary>
          <ul className="mt-3 grid gap-3 opacity-80 lg:grid-cols-2">{over.map((q, i) => <QuoteCard key={q.destination.id} q={q} i={i} href={hrefFor(q)} month={month} />)}</ul>
        </details>
      )}
      {pending.length > 0 && !batch.error && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-5 text-center">
          <p className="text-sm text-muted">
            Abbiamo controllato {live.length} {live.length === 1 ? "meta" : "mete"} partendo dalle più promettenti per stagione e costi. Per altre {pending.length} il prezzo del volo non è ancora stato rilevato; ogni controllo usa una ricerca del nostro piano.
          </p>
          <Link href={moreHref} className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white">
            <Search className="h-4 w-4" /> Controlla altre mete
          </Link>
        </div>
      )}
      <div className="text-center">
        <LinkButton href="/ispirazione" variant="outline">Sfoglia per categoria</LinkButton>
      </div>
    </div>
  );
}
