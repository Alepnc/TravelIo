import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PricedGrid, PricedGridSkeleton } from "@/components/discovery/priced-grid";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/misc";
import { MonthTabs } from "@/components/discovery/month-tabs";
import { listDestinations } from "@/server/services/discovery";
import { getSearchOptions } from "@/server/services/options";
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
      <Container className="pt-10 sm:pt-14">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <h1 className="text-[2.5rem] font-bold leading-none [font-stretch:75%] sm:text-6xl">Dove costa meno andare</h1>
        </div>
        <p className="mt-3 max-w-xl text-muted">Prezzo reale del volo A/R per persona, più una stima di alloggio e spese per 4 notti. Scegli mese e tetto di spesa.</p>

        <div className="mt-7 flex flex-wrap items-center gap-2">
          <form action="/prezzi" className="flex items-center gap-2">
            <input type="hidden" name="mese" value={month} />
            {max && <input type="hidden" name="max" value={max} />}
            <label className="text-sm font-semibold" htmlFor="da">
              Da
            </label>
            <select id="da" name="da" defaultValue={from} className="h-10 rounded-md border border-ink/20 bg-surface px-2.5 text-sm font-semibold">
              {options.origins.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button className="press h-10 rounded-md bg-ink px-3.5 text-sm font-semibold text-board-text">Aggiorna</button>
          </form>
          <span className="mx-1 hidden h-6 w-px bg-ink/20 sm:block" />
          {CAPS.map((c) => (
            <Link key={c} href={href({ max: max === c ? undefined : String(c) })} scroll={false} className={cn("press flex h-10 items-center rounded-md border px-3.5 text-sm font-semibold transition-colors duration-150", max === c ? "border-ink bg-ink text-board-text" : "border-ink/15 bg-surface hoverable:hover:border-ink/50")}>
              Sotto {c} €
            </Link>
          ))}
        </div>
        <div className="mt-3">
          <MonthTabs month={month} hrefFor={(m) => href({ mese: String(m) })} />
        </div>

        <div className="mt-8">
          <Suspense key={`${from}-${month}-${max}-${scan}`} fallback={<PricedGridSkeleton view="board" />}>
            <PricedGrid destinations={dests} from={from} month={month} maxPrice={max} ensureKnown={scan} moreHref={href({ n: "12" })} view="board" />
          </Suspense>
        </div>
      </Container>
      <Footer />
    </>
  );
}
