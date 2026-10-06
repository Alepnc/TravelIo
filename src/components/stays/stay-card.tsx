import { Check, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import type { AccommodationOffer } from "@/lib/types";
import { CoverImage } from "@/components/ui/cover-image";
import { Badge } from "@/components/ui/misc";
import { cn, formatKm, formatNumber, formatPrice } from "@/lib/format";

export const STAY_TYPE_LABEL: Record<AccommodationOffer["type"], string> = {
  hotel: "Hotel", appartamento: "Appartamento", ostello: "Ostello", resort: "Resort", bnb: "B&B",
};

function ratingLabel(r: number) {
  return r >= 9 ? "Eccezionale" : r >= 8.5 ? "Ottimo" : r >= 8 ? "Molto buono" : r >= 7 ? "Buono" : "Discreto";
}

export function StayCard({ offer, selected, action, badges = [], compact }: { offer: AccommodationOffer; selected?: boolean; action?: ReactNode; badges?: string[]; compact?: boolean }) {
  return (
    <article className={cn("flex overflow-hidden rounded-[var(--radius-card)] border bg-surface transition-[border-color,box-shadow] duration-200", compact ? "flex-col" : "flex-col sm:flex-row", selected ? "border-brand-500 shadow-[0_0_0_3px_var(--color-brand-100)]" : "border-line hoverable:hover:shadow-[var(--shadow-card)]")}>
      <div className={cn("relative shrink-0", compact ? "aspect-[16/10]" : "aspect-[16/10] sm:aspect-auto sm:w-64")}>
        <CoverImage src={offer.imageUrl} alt={offer.name} sizes="(min-width: 640px) 256px, 100vw" className="absolute inset-0" />
        <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-bold">{STAY_TYPE_LABEL[offer.type]}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cn("text-lg font-bold", compact ? "line-clamp-2 leading-snug" : "truncate")}>{offer.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> {offer.neighborhood ? `${offer.neighborhood} · ` : ""}
              {formatKm(offer.distanceFromCenterKm)} dal centro
            </p>
          </div>
          {offer.rating > 0 ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <div className={cn("text-right", compact && "hidden")}>
                <p className="text-xs font-semibold">{ratingLabel(offer.rating)}</p>
                <p className="text-[11px] text-muted">{formatNumber(offer.reviewsCount)} recensioni</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">{offer.rating.toFixed(1)}</span>
            </div>
          ) : (
            <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-muted">Nessuna recensione</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <Badge key={b} tone={b === "Più economico" ? "success" : "brand"}>
              {b}
            </Badge>
          ))}
          {offer.freeCancellation && (
            <Badge tone="success">
              <Check className="h-3 w-3" /> Cancellazione gratuita
            </Badge>
          )}
          {offer.breakfastIncluded && <Badge tone="sun">Colazione inclusa</Badge>}
        </div>
        {!compact && <p className="mt-2 line-clamp-1 text-xs text-muted">{offer.amenities.join(" · ")}</p>}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="font-display text-2xl font-extrabold leading-none">
              {formatPrice(offer.pricePerNight)}
              <span className="text-sm font-medium text-muted"> /notte</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {formatPrice(offer.priceTotal)} per {offer.nights} {offer.nights === 1 ? "notte" : "notti"}
            </p>
          </div>
          {action}
        </div>
      </div>
    </article>
  );
}

export function StayCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface sm:flex-row">
      <div className="skeleton aspect-[16/10] rounded-none sm:aspect-auto sm:h-48 sm:w-64" />
      <div className="flex-1 space-y-3 p-5">
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton mt-6 h-8 w-1/3" />
      </div>
    </div>
  );
}

