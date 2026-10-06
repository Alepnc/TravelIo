import Link from "next/link";
import { FlapStatic } from "@/components/ui/flap";
import { cn } from "@/lib/format";

/** Il marchio è una riga del tabellone: TRAVELIO in palette, la "IO" in ambra. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center rounded-sm text-[1.05rem]", className)} aria-label="TravelIo, home">
      <FlapStatic text="Travel" className="gap-[0.06em]" />
      <FlapStatic text="Io" className="ml-[0.06em] gap-[0.06em]" cellClassName="!bg-brand-500 !text-ink after:!bg-ink/30" />
    </Link>
  );
}
