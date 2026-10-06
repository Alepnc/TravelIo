"use client";

import { useState, type FormEvent } from "react";
import type { ItineraryActivity, ItineraryDay } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { formatDate } from "@/lib/time";
import { CATEGORY_META, EDITABLE_CATEGORIES } from "./category";
import type { ActivityDraft } from "./use-itinerary";

export function ActivityEditor({ activity, days, onClose, onSave }: { activity: ItineraryActivity | null; days: ItineraryDay[]; onClose: () => void; onSave: (patch: Partial<ActivityDraft> & { dayId?: string }) => void }) {
  return (
    <Sheet open={!!activity} onClose={onClose} title="Modifica attività">
      {activity && <EditorForm key={activity.id} activity={activity} days={days} onSave={onSave} />}
    </Sheet>
  );
}

function EditorForm({ activity, days, onSave }: { activity: ItineraryActivity; days: ItineraryDay[]; onSave: (patch: Partial<ActivityDraft> & { dayId?: string }) => void }) {
  const [v, setV] = useState({
    title: activity.title,
    category: activity.category,
    startTime: activity.startTime,
    durationMin: activity.durationMin,
    placeName: activity.placeName ?? "",
    cost: activity.cost,
    notes: activity.notes ?? "",
    dayId: activity.dayId,
    timeLocked: activity.timeLocked,
  });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((s) => ({ ...s, [k]: value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!v.title.trim()) return setError("Il titolo non può essere vuoto");
    if (v.durationMin < 5) return setError("Durata minima 5 minuti");
    const patch: Partial<ActivityDraft> & { dayId?: string } = {};
    if (v.title !== activity.title) patch.title = v.title.trim();
    if (v.category !== activity.category) patch.category = v.category;
    if (v.startTime !== activity.startTime) patch.startTime = v.startTime;
    if (v.durationMin !== activity.durationMin) patch.durationMin = v.durationMin;
    if (v.placeName !== (activity.placeName ?? "")) patch.placeName = v.placeName || null;
    if (v.cost !== activity.cost) patch.cost = v.cost;
    if (v.notes !== (activity.notes ?? "")) patch.notes = v.notes || null;
    if (v.timeLocked !== activity.timeLocked) patch.timeLocked = v.timeLocked;
    if (v.dayId !== activity.dayId) patch.dayId = v.dayId;
    onSave(patch);
  }

  return (
    <form onSubmit={submit} className="space-y-4 pt-1">
      {error && <p className="rounded-md bg-danger px-3 py-2 text-sm font-medium text-white" role="alert">{error}</p>}
      <Field label="Titolo" htmlFor="ed-title">
        <Input id="ed-title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inizio" htmlFor="ed-time">
          <Input id="ed-time" type="time" value={v.startTime} onChange={(e) => set("startTime", e.target.value)} />
        </Field>
        <Field label="Durata (min)" htmlFor="ed-dur">
          <Input id="ed-dur" type="number" min={5} max={960} step={5} value={v.durationMin} onChange={(e) => set("durationMin", Number(e.target.value))} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.timeLocked} onChange={(e) => set("timeLocked", e.target.checked)} className="h-4 w-4 accent-ink" />
        Orario fisso (non spostarlo quando riordino)
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Giorno" htmlFor="ed-day">
          <Select id="ed-day" value={v.dayId} onChange={(e) => set("dayId", e.target.value)}>
            {days.map((d) => (
              <option key={d.id} value={d.id}>
                Giorno {d.dayIndex + 1} · {formatDate(d.date)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Categoria" htmlFor="ed-cat">
          <Select id="ed-cat" value={v.category} onChange={(e) => set("category", e.target.value as typeof v.category)}>
            {EDITABLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_8rem] gap-3">
        <Field label="Luogo" htmlFor="ed-place">
          <Input id="ed-place" value={v.placeName} onChange={(e) => set("placeName", e.target.value)} maxLength={120} />
        </Field>
        <Field label="Costo a pers. (€)" htmlFor="ed-cost">
          <Input id="ed-cost" type="number" min={0} step={1} value={v.cost} onChange={(e) => set("cost", Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Note" htmlFor="ed-notes">
        <Textarea id="ed-notes" value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} placeholder="Prenotazione, cosa portare, link…" />
      </Field>
      <Button type="submit" className="w-full" size="lg">
        Salva modifiche
      </Button>
    </form>
  );
}
