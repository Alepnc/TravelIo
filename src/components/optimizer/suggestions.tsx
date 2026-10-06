"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BedDouble, CalendarClock, Lightbulb, Plane, RefreshCw, Route, Search, TriangleAlert } from "lucide-react";
import type { Suggestion } from "@/server/services/optimizer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { cn, formatPrice } from "@/lib/format";

const ICONS = { volo: Plane, date: CalendarClock, alloggio: BedDouble, itinerario: Route, budget: TriangleAlert };

export function SuggestionList({ tripId, onApplied, compact, canComparePrices = true }: { tripId: string; onApplied?: () => void; compact?: boolean; canComparePrices?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  // "free" = solo calcoli locali; "all" = confronta anche voli, date e alloggi con ricerche reali (a pagamento)
  const [scope, setScope] = useState<"free" | "all">("free");
  const reload = () => {
    setItems(null);
    setError(null);
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    let alive = true;
    fetch(`/api/trips/${tripId}/suggestions?scope=${scope}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (alive) setItems(data.suggestions);
      })
      .catch((e) => alive && setError(e instanceof Error && e.message ? e.message : "Impossibile calcolare i suggerimenti"));
    return () => {
      alive = false;
    };
  }, [tripId, version, scope]);

  async function apply(s: Suggestion) {
    if (!s.action) return;
    setApplying(s.id);
    const res = await fetch(`/api/trips/${tripId}/suggestions/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s.action) });
    setApplying(null);
    if (!res.ok) {
      toast.error((await res.json().catch(() => null))?.error ?? "Non è stato possibile applicare il suggerimento");
      return;
    }
    toast.success(s.savings ? `Fatto! Hai risparmiato ${formatPrice(s.savings)}` : "Suggerimento applicato");
    onApplied?.();
    router.refresh();
    reload();
  }

  return (
    <section aria-labelledby="optimizer-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="optimizer-title" className="flex items-center gap-2 text-lg font-bold">
          <Lightbulb className="h-5 w-5 text-sun-500" /> Travel optimizer
        </h2>
        <button onClick={reload} className="press flex h-8 w-8 items-center justify-center rounded-full text-muted hoverable:hover:bg-ink/5" aria-label="Ricalcola suggerimenti">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      {canComparePrices && scope === "free" && (
        <div className="mb-3 rounded-2xl border border-dashed border-line p-3.5">
          <p className="text-sm text-ink-soft">Vuoi anche confrontare date, voli e alloggi alternativi? Controlliamo prezzi reali (fino a 9 ricerche del nostro piano).</p>
          <Button size="sm" variant="outline" className="mt-2.5" onClick={() => { setItems(null); setError(null); setScope("all"); }} icon={<Search className="h-3.5 w-3.5" />}>
            Cerca risparmi su voli e alloggi
          </Button>
        </div>
      )}
      {error ? (
        <p className="rounded-2xl bg-danger/5 p-4 text-sm text-danger">{error}</p>
      ) : items === null ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">Nessun risparmio evidente: le tue scelte sono già ottime. Aggiungi voli o alloggio per altri confronti.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.slice(0, compact ? 3 : undefined).map((s) => {
            const Icon = ICONS[s.kind];
            return (
              <li key={s.id} className={cn("animate-fade-up rounded-2xl border p-4", s.kind === "budget" ? "border-danger/30 bg-danger/5" : "border-sun-400/50 bg-sun-100/50")}>
                <div className="flex gap-3">
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.kind === "budget" ? "text-danger" : "text-ink")} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{s.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{s.description}</p>
                    {s.action && (
                      <Button size="sm" variant="primary" className="mt-3" loading={applying === s.id} onClick={() => apply(s)}>
                        Applica
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
