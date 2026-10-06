import { DataSourceBadge } from "@/components/ui/data-source-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PricedGrid, PricedGridSkeleton } from "@/components/discovery/priced-grid";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/misc";
import { listDestinations } from "@/server/services/discovery";
import { getSearchOptions } from "@/server/services/options";
import { monthName } from "@/lib/time";
import { cn } from "@/lib/format";

export const metadata: Metadata = { title: "Prezzi", description: "Le mete più economiche mese per mese dal tuo aeroporto." };

const CAPS = [300, 500, 800];

export default async function PricesPage({ searchParams }: PageProps<"/prezzi">) {
  const sp = await searchParams;
  const nextMonth = (new Date().getMonth() + 1) % 12 + 1;
  const month = Number(sp.mese) >= 1 && Number(sp.mese) <= 12 ? Number(sp.mese) : nextMonth;
  const max = Number(sp.max) > 0 ? Number(sp.max) : undefined;
  const scan = Math.min(12, Math.max(3, Number(sp.n) || 3));
  const options = await getSearchOptions();
  const from = typeof sp.da === "string" && options.origins.some((o) => o.value === sp.da) ? sp.da : options.homeAirport;
  const dests = await listDestinations();
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ mese: String(month), max: max ? String(max) : undefined, da: from, ...patch })) if (v) p.set(k, v);
    return `/prezzi?${p}`;
  };

  return (
    <>
      <Container className="pt-8 sm:pt-12">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Dove costa meno andare</h1>
          <DataSourceBadge />
        </div>
        <p className="mt-2 max-w-xl text-muted">Prezzo reale del volo A/R per persona, più una stima di alloggio e spese per 4 notti. Scegli mese e tetto di spesa.</p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <form action="/prezzi" className="flex items-center gap-2">
            <input type="hidden" name="mese" value={month} />
            {max && <input type="hidden" name="max" value={max} />}
            <label className="text-sm font-medium text-muted" htmlFor="da">
              Da
            </label>
            <select id="da" name="da" defaultValue={from} className="h-9 rounded-full border border-line bg-surface px-3 text-sm font-semibold">
              {options.origins.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button className="press h-9 rounded-full bg-ink px-3 text-sm font-semibold text-white">Aggiorna</button>
          </form>
          <span className="mx-1 h-5 w-px bg-line" />
          {CAPS.map((c) => (
            <Link key={c} href={href({ max: max === c ? undefined : String(c) })} scroll={false} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold", max === c ? "border-ink bg-ink text-white" : "border-line bg-surface")}>
              Sotto {c} €
            </Link>
          ))}
        </div>
        <div className="scrollbar-none -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <Link key={m} href={href({ mese: String(m) })} scroll={false} className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-medium", m === month ? "bg-brand-500 text-white" : "text-muted hoverable:hover:bg-ink/5")}>
              {monthName(m, true)}
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Suspense key={`${from}-${month}-${max}-${scan}`} fallback={<PricedGridSkeleton />}>
            <PricedGrid destinations={dests} from={from} month={month} maxPrice={max} ensureKnown={scan} moreHref={href({ n: "12" })} />
          </Suspense>
        </div>
      </Container>
      <Footer />
    </>
  );
}
