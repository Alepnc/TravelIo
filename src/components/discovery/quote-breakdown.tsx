import type { DestinationQuote } from "@/server/services/discovery";
import { formatPrice } from "@/lib/format";
import { diffDays } from "@/lib/time";

/** Dettaglio costi: il volo è un prezzo reale rilevato, alloggio e spese sono stime di catalogo (e si vede). */
export function QuoteBreakdown({ quote, className }: { quote: DestinationQuote; className?: string }) {
  const nights = diffDays(quote.departDate, quote.returnDate);
  if (quote.flightStatus !== "live")
    return <p className={className}>Prezzo del volo non ancora rilevato</p>;
  return (
    <p className={className}>
      <span className="font-semibold text-ink-soft">Volo A/R {formatPrice(quote.flightPrice!)}</span> (reale) · alloggio ~{formatPrice(quote.stayEstimate)} · spese ~{formatPrice(quote.dailyEstimate)}{" "}
      <span className="whitespace-nowrap">(stime, {nights} notti)</span>
    </p>
  );
}
