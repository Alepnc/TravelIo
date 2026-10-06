"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Clock, Plus, Search } from "lucide-react";
import type { ItineraryDay, LatLng, PointOfInterest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { estimateTravel } from "@/lib/geo";
import { cn, formatPrice } from "@/lib/format";
import { formatDuration, fromMinutes, toMinutes } from "@/lib/time";
import { CATEGORY_META, EDITABLE_CATEGORIES } from "./category";
import type { ActivityDraft } from "./use-itinerary";

/** Orario proposto: subito dopo l'ultima attività della giornata (prima dei trasferimenti finali). */
export function nextFreeTime(day: ItineraryDay | undefined): string {
  const acts = (day?.activities ?? []).filter((a) => a.category !== "volo" && !(a.category === "trasporto" && a.title.includes("aeroporto")));
  const last = acts.at(-1);
  if (!last) return "10:00";
  return fromMinutes(Math.min(toMinutes("22:00"), Math.ceil((toMinutes(last.startTime) + last.durationMin + 15) / 15) * 15));
}

export function AddActivitySheet({ open, onClose, day, pois, usedPoiIds, onAdd }: { open: boolean; onClose: () => void; day: ItineraryDay | undefined; pois: PointOfInterest[]; usedPoiIds: Set<string>; onAdd: (draft: ActivityDraft) => void }) {
  const [tab, setTab] = useState<"suggeriti" | "libera">("suggeriti");
  const [query, setQuery] = useState("");
  const anchor: LatLng | null = useMemo(() => {
    const withCoords = (day?.activities ?? []).filter((a) => a.lat != null && a.lng != null && a.category !== "volo");
    const last = withCoords.at(-1);
    return last ? { lat: last.lat!, lng: last.lng! } : null;
  }, [day]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pois
      .filter((p) => !usedPoiIds.has(p.id) && (!q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q))))
      .map((p) => ({ p, minutes: anchor ? estimateTravel(anchor, p.location).minutes : null }))
      .sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0));
  }, [pois, usedPoiIds, query, anchor]);

  const startTime = nextFreeTime(day);

  return (
    <Sheet open={open} onClose={onClose} title={`Aggiungi al giorno ${(day?.dayIndex ?? 0) + 1}`}>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-ink/5 p-1" role="tablist">
        {(["suggeriti", "libera"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-lg py-2 text-sm font-semibold", tab === t ? "bg-surface shadow-sm" : "text-muted")}>
            {t === "suggeriti" ? "Luoghi suggeriti" : "Attività libera"}
          </button>
        ))}
      </div>
      {tab === "suggeriti" ? (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca: museo, tramonto, mercato…" className="pl-9" aria-label="Cerca luoghi" />
          </div>
          {suggestions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nessun luogo trovato. Prova &quot;Attività libera&quot;.</p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map(({ p, minutes }) => (
                <li key={p.id}>
                  <button
                    onClick={() => onAdd({ title: p.name, category: p.category, startTime, durationMin: p.durationMin, placeName: p.name, lat: p.location.lat, lng: p.location.lng, cost: p.cost, notes: p.description, poiId: p.id })}
                    className="press flex w-full items-start gap-3 rounded-2xl border border-line p-3 text-left hoverable:hover:border-brand-300"
                  >
                    <span className="text-xl" aria-hidden>{CATEGORY_META[p.category].emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{p.name}</span>
                      <span className="line-clamp-1 block text-xs text-muted">{p.description}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-soft">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(p.durationMin)}</span>
                        <span>{p.cost ? formatPrice(p.cost) : "Gratis"}</span>
                        <span>{p.opening.open}–{p.opening.close === "23:59" ? "24:00" : p.opening.close}</span>
                        {minutes != null && <span className="font-semibold text-brand-700">{minutes} min dall&apos;ultima tappa</span>}
                      </span>
                    </span>
                    <Plus className="mt-1 h-5 w-5 shrink-0 text-brand-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <CustomActivityForm startTime={startTime} anchor={anchor} onAdd={onAdd} />
      )}
    </Sheet>
  );
}

function CustomActivityForm({ startTime, anchor, onAdd }: { startTime: string; anchor: LatLng | null; onAdd: (d: ActivityDraft) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ActivityDraft["category"]>("altro");
  const [time, setTime] = useState(startTime);
  const [duration, setDuration] = useState(60);
  const [cost, setCost] = useState(0);
  const [place, setPlace] = useState("");
  const [error, setError] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Dai un titolo all'attività");
    // Senza geocoding reale, l'attività libera si posiziona vicino all'ultima tappa
    onAdd({ title: title.trim(), category, startTime: time, durationMin: duration, cost, placeName: place || null, lat: anchor?.lat ?? null, lng: anchor?.lng ?? null, timeLocked: true });
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <Field label="Cosa vuoi fare?" htmlFor="new-title">
        <Input id="new-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Aperitivo al tramonto" maxLength={120} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inizio" htmlFor="new-time">
          <Input id="new-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Durata (min)" htmlFor="new-dur">
          <Input id="new-dur" type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria" htmlFor="new-cat">
          <Select id="new-cat" value={category} onChange={(e) => setCategory(e.target.value as ActivityDraft["category"])}>
            {EDITABLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Costo a pers. (€)" htmlFor="new-cost">
          <Input id="new-cost" type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Luogo (opzionale)" htmlFor="new-place">
        <Input id="new-place" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={120} />
      </Field>
      <Button type="submit" className="w-full" size="lg" icon={<Plus className="h-4 w-4" />}>
        Aggiungi
      </Button>
    </form>
  );
}
