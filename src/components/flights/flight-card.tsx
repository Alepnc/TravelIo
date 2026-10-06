import { Briefcase, Check, Info, Luggage, Plane } from "lucide-react";
import type { FlightOffer } from "@/lib/types";
import { Badge } from "@/components/ui/misc";
import { cn, formatPrice } from "@/lib/format";
import { formatDuration, timeOf } from "@/lib/time";
import type { ReactNode } from "react";

export function FlightCard({ offer, travelers = 1, badges = [], selected, action }: { offer: FlightOffer; travelers?: number; badges?: string[]; selected?: boolean; action?: ReactNode }) {
  const nextDay = offer.arriveAt.slice(0, 10) !== offer.departAt.slice(0, 10);
  return (
    <article className={cn("rounded-[var(--radius-card)] border bg-surface p-4 transition-[border-color,box-shadow] duration-200 sm:p-5", selected ? "border-brand-500 shadow-[0_0_0_3px_var(--color-brand-100)]" : "border-line hoverable:hover:shadow-[var(--shadow-card)]")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/5 text-xs font-bold text-ink-soft" aria-hidden>
          {offer.airlineCode}
        </span>
        <span className="font-semibold">{offer.airline}</span>
        <span className="text-xs text-muted">{offer.flightNumber}</span>
        <div className="ml-auto flex gap-1.5">
          {badges.map((b) => (
            <Badge key={b} tone={b === "Più economico" ? "success" : b === "Consigliato" ? "brand" : "sun"}>
              {b}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 sm:gap-5">
        <div>
          <p className="font-display text-2xl font-bold tabular-nums">{timeOf(offer.departAt)}</p>
          <p className="text-sm font-medium text-muted">{offer.fromCode}</p>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-xs font-medium text-muted">{formatDuration(offer.durationMin)}</span>
          <div className="relative my-1 h-px w-full bg-line">
            <Plane className="absolute -top-2 right-0 h-4 w-4 rotate-45 text-muted" aria-hidden />
            {offer.stops > 0 && <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-warning" />}
          </div>
          <span className={cn("text-xs font-semibold", offer.stops ? "text-warning" : "text-success")}>{offer.stops ? `1 scalo · ${offer.stopCodes.join(", ")}` : "Diretto"}</span>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold tabular-nums">
            {timeOf(offer.arriveAt)}
            {nextDay && <sup className="ml-0.5 text-xs text-danger">+1</sup>}
          </p>
          <p className="text-sm font-medium text-muted">{offer.toCode}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
          {offer.baggage.cabin === null && offer.baggage.checked === null ? (
            <span className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> Bagagli: verifica sul sito del venditore
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" /> {offer.baggage.cabin ? "Trolley incluso" : "Solo borsa piccola"}
              </span>
              <span className={cn("flex items-center gap-1", !offer.baggage.checked && "text-muted")}>
                <Luggage className="h-3.5 w-3.5" /> {offer.baggage.checked ? "Stiva inclusa" : "Stiva a pagamento"}
              </span>
            </>
          )}
          {offer.refundable && (
            <span className="flex items-center gap-1 text-success">
              <Check className="h-3.5 w-3.5" /> Rimborsabile
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold leading-none">{formatPrice(offer.price)}</p>
            <p className="text-xs text-muted">{travelers > 1 ? `a persona · ${formatPrice(offer.price * travelers)} totale` : "a persona"}</p>
          </div>
          {action}
        </div>
      </div>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer select-none font-medium">Condizioni</summary>
        <ul className="mt-1.5 list-inside list-disc space-y-0.5">
          {offer.conditions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export function FlightCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="skeleton h-5 w-40" />
      <div className="mt-5 flex items-center gap-4">
        <div className="skeleton h-10 w-16" />
        <div className="skeleton h-2 flex-1" />
        <div className="skeleton h-10 w-16" />
      </div>
      <div className="skeleton mt-5 h-8 w-full" />
    </div>
  );
}
