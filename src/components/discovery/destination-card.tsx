import Link from "next/link";
import type { Destination } from "@/lib/types";
import { CoverImage } from "@/components/ui/cover-image";
import { formatPrice } from "@/lib/format";
import { monthName } from "@/lib/time";

/** Meta con foto: l'immagine parla da sola, nome e prezzo stanno sotto, mai sopra la foto. */
export function DestinationCard({ destination: d, price, priceLabel = "da", href, note, priority }: { destination: Destination; price?: number | null; priceLabel?: string; href?: string; note?: string; priority?: boolean }) {
  const months = d.bestMonths.slice(0, 3).map((m) => monthName(m, true)).join(", ");
  return (
    <Link href={href ?? `/destinazioni/${d.id}`} className="group block animate-fade-up">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-board">
        <CoverImage src={d.imageUrl} alt={`${d.name}, ${d.country}`} label={d.name} sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw" priority={priority} className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out)] hoverable:group-hover:scale-[1.03]" />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted">
            {d.country} · {d.airportCode}
          </p>
          <h3 className="truncate text-xl font-bold leading-tight [font-stretch:80%]">{d.name}</h3>
        </div>
        {price != null ? (
          <p className="shrink-0 text-right">
            <span className="block text-[11px] text-muted">{priceLabel}</span>
            <span className="tabular text-lg font-bold leading-none [font-stretch:85%]">{formatPrice(price)}</span>
          </p>
        ) : null}
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span>Meglio a {months}</span>
        {note && <span className="rounded-sm bg-brand-500 px-1.5 py-px text-xs font-semibold text-ink">{note}</span>}
      </p>
    </Link>
  );
}

export function DestinationCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/5] rounded-md" />
      <div className="skeleton mt-3 h-5 w-2/3" />
      <div className="skeleton mt-2 h-4 w-1/2" />
    </div>
  );
}
