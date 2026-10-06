import Link from "next/link";
import type { Destination } from "@/lib/types";
import { CoverImage } from "@/components/ui/cover-image";
import { flagEmoji, formatPrice } from "@/lib/format";
import { monthName } from "@/lib/time";

export function DestinationCard({ destination: d, price, priceLabel = "da", href, note, priority }: { destination: Destination; price?: number | null; priceLabel?: string; href?: string; note?: string; priority?: boolean }) {
  const months = d.bestMonths.slice(0, 3).map((m) => monthName(m, true)).join(", ");
  return (
    <Link href={href ?? `/destinazioni/${d.id}`} className="group block animate-fade-up">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)]">
        <CoverImage src={d.imageUrl} alt={`${d.name}, ${d.country}`} label={d.name} sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 80vw" priority={priority} className="absolute inset-0 transition-transform duration-500 ease-[var(--ease-out)] hoverable:group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {price != null && (
          <span className="absolute right-3 top-3 rounded-full bg-surface/95 px-3 py-1 text-sm font-bold text-ink shadow-sm backdrop-blur">
            <span className="font-medium text-muted">{priceLabel} </span>
            {formatPrice(price)}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-sm font-medium text-white/80">
            {flagEmoji(d.countryCode)} {d.country}
          </p>
          <h3 className="text-2xl font-bold">{d.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-white/85">{d.tagline}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between px-1 text-sm">
        <span className="text-muted">Meglio a {months}</span>
        {note && <span className="font-semibold text-success">{note}</span>}
      </div>
    </Link>
  );
}

export function DestinationCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/5] rounded-[var(--radius-card)]" />
      <div className="skeleton mt-3 h-4 w-2/3" />
    </div>
  );
}
