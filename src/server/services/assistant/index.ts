import "server-only";
import { z } from "zod";
import type { AssistantOperation, AssistantReply } from "@/lib/assistant";
import { assistantMessageSchema } from "@/lib/validation";
import { addDays, representativeStart } from "./dates";
import { activities as activityProvider, destinations } from "@/server/providers";
import { AppError } from "../errors";
import { createActivity, deleteActivity, regenerateDay, reorderItinerary, updateActivity } from "../itinerary";
import { getTripDetail } from "../trips";
import { claudeAvailable, claudeReply } from "./claude";
import type { AssistantContext } from "./context";
import { ruleBasedReply } from "./rules";

async function buildContext(userId: string, tripId: string | null, focusDayId?: string): Promise<AssistantContext> {
  const trip = tripId ? await getTripDetail(userId, tripId) : null;
  const [pois, dests] = await Promise.all([
    trip ? activityProvider.listForDestination(trip.destinationId) : Promise.resolve([]),
    destinations.list(),
  ]);
  const focusDayIndex = trip?.itinerary?.days.find((d) => d.id === focusDayId)?.dayIndex ?? null;
  return { trip, pois, destinations: dests, focusDayIndex };
}

export async function askAssistant(userId: string, tripId: string | null, raw: z.input<typeof assistantMessageSchema>): Promise<AssistantReply> {
  const input = assistantMessageSchema.parse(raw);
  const ctx = await buildContext(userId, tripId, input.focusDayId);
  if (claudeAvailable()) return claudeReply(input.message, input.history, ctx);
  return ruleBasedReply(input.message, ctx);
}

export interface ApplyResult {
  applied: number;
  /** Per create_trip: dove portare l'utente (form precompilato) */
  redirectTo?: string;
}

/** Applica le proposte accettate, una per una, rivalidando id e proprietà tramite i servizi. */
export async function applyOperations(userId: string, tripId: string | null, ops: AssistantOperation[]): Promise<ApplyResult> {
  let applied = 0;
  for (const op of ops) {
    if (op.type === "create_trip") {
      const start = representativeStart();
      const params = new URLSearchParams({
        to: op.destinationId,
        depart: start,
        ret: addDays(start, Math.max(0, op.days - 1)),
        travelers: String(op.travelers ?? 2),
        ...(op.budgetPerPerson ? { budget: String(op.budgetPerPerson) } : {}),
      });
      return { applied: applied + 1, redirectTo: `/viaggi/nuovo?${params}` };
    }
    if (!tripId) throw new AppError("validation", "Questa operazione richiede un viaggio");
    const trip = await getTripDetail(userId, tripId);
    const days = trip.itinerary?.days ?? [];
    const dayAt = (i: number) => {
      const d = days[i];
      if (!d) throw new AppError("conflict", "La giornata indicata non esiste più");
      return d;
    };

    switch (op.type) {
      case "add_activity": {
        const day = dayAt(op.dayIndex);
        const poi = op.poiId ? await activityProvider.get(op.poiId) : null;
        if (op.poiId && (!poi || poi.destinationId !== trip.destinationId)) throw new AppError("conflict", "Luogo non disponibile per questa destinazione");
        const title = poi?.name ?? op.title;
        if (!title) throw new AppError("validation", "Attività senza titolo");
        await createActivity(userId, tripId, {
          dayId: day.id, title, category: poi?.category ?? op.category ?? "altro", startTime: op.startTime ?? "15:00",
          durationMin: op.durationMin ?? poi?.durationMin ?? 60, cost: op.cost ?? poi?.cost ?? 0, placeName: poi?.name ?? null,
          lat: poi?.location.lat ?? null, lng: poi?.location.lng ?? null, notes: poi?.description ?? null, poiId: poi?.id ?? null,
          timeLocked: false,
        }, "assistant");
        break;
      }
      case "remove_activity":
        await deleteActivity(userId, tripId, op.activityId);
        break;
      case "replace_activity": {
        const poi = await activityProvider.get(op.poiId);
        if (!poi || poi.destinationId !== trip.destinationId) throw new AppError("conflict", "Luogo non disponibile per questa destinazione");
        await updateActivity(userId, tripId, op.activityId, {
          title: poi.name, category: poi.category, durationMin: poi.durationMin, cost: poi.cost, placeName: poi.name,
          lat: poi.location.lat, lng: poi.location.lng, notes: poi.description, poiId: poi.id,
        });
        break;
      }
      case "move_activity": {
        const target = dayAt(op.toDayIndex);
        const from = days.find((d) => d.activities.some((a) => a.id === op.activityId));
        if (!from) throw new AppError("conflict", "L'attività non esiste più");
        if (from.id === target.id) break;
        // Inserimento prima di eventuali voli/trasferimenti finali della giornata di arrivo
        const ids = target.activities.map((a) => a.id);
        const tail = target.activities.findIndex((a) => a.category === "trasporto" && a.title.includes("aeroporto"));
        ids.splice(tail >= 0 ? tail : ids.length, 0, op.activityId);
        await reorderItinerary(userId, tripId, {
          days: [
            { dayId: from.id, activityIds: from.activities.map((a) => a.id).filter((id) => id !== op.activityId) },
            { dayId: target.id, activityIds: ids },
          ],
        });
        break;
      }
      case "update_activity":
        await updateActivity(userId, tripId, op.activityId, {
          ...(op.startTime && { startTime: op.startTime }),
          ...(op.durationMin && { durationMin: op.durationMin }),
          ...(op.notes != null && { notes: op.notes }),
        });
        break;
      case "regenerate_day":
        await regenerateDay(userId, tripId, dayAt(op.dayIndex).id, { pace: op.pace });
        break;
    }
    applied++;
  }
  return { applied };
}
