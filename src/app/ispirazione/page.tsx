import type { Metadata } from "next";
import { Suspense } from "react";
import type { DestinationCategory } from "@/lib/types";
import { CategoryChips } from "@/components/discovery/category-chips";
import { PricedGrid, PricedGridSkeleton } from "@/components/discovery/priced-grid";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/misc";
import { MonthTabs } from "@/components/discovery/month-tabs";
import { CATEGORY_META } from "@/server/mock-data/destinations";
import { listDestinations } from "@/server/services/discovery";
import { getSearchOptions } from "@/server/services/options";

export const metadata: Metadata = { title: "Trova ispirazione", description: "Mete per categoria, periodo e budget: mare, nightlife, natura, cultura e weekend economici." };

export default async function InspirationPage({ searchParams }: PageProps<"/ispirazione">) {
  const sp = await searchParams;
  const category = typeof sp.categoria === "string" && sp.categoria in CATEGORY_META ? (sp.categoria as DestinationCategory) : undefined;
  const nextMonth = (new Date().getMonth() + 1) % 12 + 1;
  const month = Number(sp.mese) >= 1 && Number(sp.mese) <= 12 ? Number(sp.mese) : nextMonth;
  const [dests, options] = await Promise.all([listDestinations({ category }), getSearchOptions()]);
  // Quanti prezzi reali garantire (i mancanti costano una ricerca ciascuno): pochi di default, più su richiesta
  const scan = Math.min(12, Math.max(3, Number(sp.n) || 3));
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { categoria: category, mese: String(month), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/ispirazione?${p}`;
  };

  return (
    <>
      <Container className="pt-10 sm:pt-14">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <h1 className="text-[2.5rem] font-bold leading-none [font-stretch:75%] sm:text-6xl">Trova ispirazione</h1>
        </div>
        <p className="mt-3 max-w-xl text-muted">
          {category ? CATEGORY_META[category].description : "Tutte le mete, ordinate per quanto costano davvero"}. Volo A/R reale da {options.homeAirport} per 4 notti, dove rilevato.
        </p>

        <div className="mt-7">
          <CategoryChips active={category} hrefFor={(k) => href({ categoria: k === category ? undefined : k })} />
        </div>
        <div className="mt-3">
          <MonthTabs month={month} hrefFor={(m) => href({ mese: String(m) })} />
        </div>

        <div className="mt-8">
          <Suspense key={`${category}-${month}-${scan}`} fallback={<PricedGridSkeleton />}>
            <PricedGrid destinations={dests} from={options.homeAirport} month={month} ensureKnown={scan} moreHref={href({ n: "12" })} />
          </Suspense>
        </div>
      </Container>
      <Footer />
    </>
  );
}
