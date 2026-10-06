import { DataSourceBadge } from "@/components/ui/data-source-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { DestinationCategory } from "@/lib/types";
import { CategoryChips } from "@/components/discovery/category-chips";
import { PricedGrid, PricedGridSkeleton } from "@/components/discovery/priced-grid";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/misc";
import { CATEGORY_META } from "@/server/mock-data/destinations";
import { listDestinations } from "@/server/services/discovery";
import { getSearchOptions } from "@/server/services/options";
import { monthName } from "@/lib/time";
import { cn } from "@/lib/format";

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
      <Container className="pt-8 sm:pt-12">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Trova ispirazione</h1>
          <DataSourceBadge />
        </div>
        <p className="mt-2 max-w-xl text-muted">
          {category ? CATEGORY_META[category].description : "Tutte le mete, ordinate per quanto costano davvero"} — volo A/R reale da {options.homeAirport} per 4 notti, dove rilevato.
        </p>

        <div className="mt-7">
          <CategoryChips active={category} hrefFor={(k) => href({ categoria: k === category ? undefined : k })} />
        </div>
        <div className="scrollbar-none -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <Link key={m} href={href({ mese: String(m) })} scroll={false} className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-medium", m === month ? "bg-brand-500 text-white" : "text-muted hoverable:hover:bg-ink/5")}>
              {monthName(m, true)}
            </Link>
          ))}
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
