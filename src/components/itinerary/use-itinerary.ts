"use client";

/**
 * Stato dell'itinerario lato client con aggiornamenti ottimistici:
 * la UI cambia subito (stesso ricalcolo orari del server, `reflowDay`), poi la risposta
 * del server sostituisce lo stato. In caso di errore si torna allo stato precedente.
 */
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { Itinerary, ItineraryActivity, TripPace } from "@/lib/types";
import { reflowDay } from "@/lib/itinerary/reflow";

async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Operazione non riuscita");
  return data as T;
}

export type ActivityDraft = Partial<Omit<ItineraryActivity, "id" | "dayId" | "position" | "source" | "isUserModified" | "travelMinFromPrev">> & { title: string };

export function useItinerary(tripId: string, initial: Itinerary | null) {
  const [itinerary, setItinerary] = useState<Itinerary | null>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const snapshot = useRef<Itinerary | null>(initial);

  const base = `/api/trips/${tripId}`;

  /** Applica subito `optimistic`, poi chiama il server; rollback se fallisce. */
  const mutate = useCallback(
    async (label: string, optimistic: ((it: Itinerary) => Itinerary) | null, request: () => Promise<{ itinerary: Itinerary | null }>, success?: string) => {
      const previous = snapshot.current;
      if (optimistic && previous) {
        const next = optimistic(previous);
        snapshot.current = next;
        setItinerary(next);
      }
      setBusy(label);
      try {
        const { itinerary: fresh } = await request();
        snapshot.current = fresh;
        setItinerary(fresh);
        if (success) toast.success(success);
        return true;
      } catch (e) {
        snapshot.current = previous;
        setItinerary(previous);
        toast.error(e instanceof Error ? e.message : "Operazione non riuscita");
        return false;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const replace = useCallback((it: Itinerary | null) => {
    snapshot.current = it;
    setItinerary(it);
  }, []);

  const generate = (opts: { pace?: TripPace; overwriteUserChanges?: boolean }) =>
    mutate("generate", null, async () => {
      const r = await api<{ itinerary: Itinerary; preservedDays: number }>(`${base}/itinerary`, "POST", opts);
      if (r.preservedDays) toast.info(`${r.preservedDays} ${r.preservedDays === 1 ? "giornata modificata da te è rimasta" : "giornate modificate da te sono rimaste"} invariate`);
      return r;
    }, "Itinerario pronto");

  const regenerateDay = (dayId: string, pace?: TripPace) =>
    mutate(`day:${dayId}`, null, () => api(`${base}/itinerary/days/${dayId}/regenerate`, "POST", { pace }), "Giornata riorganizzata");

  /** Nuovo ordine per una o più giornate (drag & drop, sposta giorno) */
  const reorder = (days: { dayId: string; activityIds: string[] }[]) =>
    mutate(
      "reorder",
      (it) => {
        const all = new Map(it.days.flatMap((d) => d.activities.map((a) => [a.id, a] as const)));
        return {
          ...it,
          days: it.days.map((d) => {
            const change = days.find((x) => x.dayId === d.id);
            if (!change) return d;
            const list = change.activityIds.map((id, i) => ({ ...all.get(id)!, dayId: d.id, position: i }));
            return { ...d, isUserModified: true, activities: reflowDay(list, d.activities[0]?.startTime) };
          }),
        };
      },
      () => api(`${base}/itinerary/order`, "PUT", { days }),
    );

  const update = (activityId: string, patch: Partial<ActivityDraft> & { dayId?: string }) =>
    mutate(
      `act:${activityId}`,
      (it) => ({
        ...it,
        days: it.days.map((d) => ({ ...d, activities: d.activities.map((a) => (a.id === activityId && !patch.dayId ? { ...a, ...patch, isUserModified: true } : a)) })),
      }),
      () => api(`${base}/activities/${activityId}`, "PATCH", patch),
      "Attività aggiornata",
    );

  const remove = async (activity: ItineraryActivity) => {
    const ok = await mutate(
      `act:${activity.id}`,
      (it) => ({ ...it, days: it.days.map((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== activity.id) })) }),
      () => api(`${base}/activities/${activity.id}`, "DELETE"),
    );
    if (ok)
      toast(`"${activity.title}" rimossa`, {
        action: {
          label: "Annulla",
          onClick: () => create(activity.dayId, { ...activity, timeLocked: activity.timeLocked }),
        },
      });
  };

  const create = (dayId: string, draft: ActivityDraft) =>
    mutate("create", null, () =>
      api(`${base}/activities`, "POST", {
        dayId,
        title: draft.title,
        category: draft.category ?? "altro",
        startTime: draft.startTime ?? "15:00",
        durationMin: draft.durationMin ?? 60,
        placeName: draft.placeName ?? null,
        lat: draft.lat ?? null,
        lng: draft.lng ?? null,
        cost: draft.cost ?? 0,
        notes: draft.notes ?? null,
        poiId: draft.poiId ?? null,
        timeLocked: draft.timeLocked ?? false,
      }),
    "Attività aggiunta");

  return { itinerary, busy, generate, regenerateDay, reorder, update, remove, create, replace };
}
