import "server-only";
import type { TripDetail } from "@/lib/dto";
import type { AssistantOperation, AssistantProposal } from "@/lib/assistant";
import type { Destination, PointOfInterest } from "@/lib/types";
import { computeBudget } from "@/lib/budget";
import { formatPrice } from "@/lib/format";

export interface AssistantContext {
  trip: TripDetail | null;
  pois: PointOfInterest[];
  destinations: Destination[];
  focusDayIndex: number | null;
}

/** Contesto compatto (JSON) passato al modello: solo ciò che serve a proporre operazioni valide. */
export function serializeContext(ctx: AssistantContext): string {
  if (!ctx.trip) {
    return JSON.stringify({
      viaggio: null,
      destinazioni_disponibili: ctx.destinations.map((d) => ({ id: d.id, nome: d.name, paese: d.country, costo_giornaliero: d.dailyCost, notte_media: d.avgNightlyPrice })),
    });
  }
  const t = ctx.trip;
  const budget = computeBudget(t);
  return JSON.stringify({
    viaggio: {
      nome: t.name, destinazione: t.destinationName, dal: t.startDate, al: t.endDate, viaggiatori: t.travelersCount,
      budget_per_persona: t.budgetPerPerson, ritmo: t.pace,
      costo_stimato_totale: budget.estimatedTotal, sforamento_budget: budget.overBy,
      alloggio: t.stay ? { nome: t.stay.name, zona: t.stay.neighborhood } : null,
      voli: t.flights.map((f) => ({ direzione: f.direction, partenza: f.departAt, arrivo: f.arriveAt })),
    },
    giorno_in_focus: ctx.focusDayIndex,
    itinerario: t.itinerary?.days.map((d) => ({
      dayIndex: d.dayIndex, data: d.date, titolo: d.title,
      attivita: d.activities.map((a) => ({ id: a.id, ora: a.startTime, durata: a.durationMin, titolo: a.title, categoria: a.category, costo: a.cost, poiId: a.poiId, bloccata: a.timeLocked })),
    })) ?? "non ancora generato",
    poi_disponibili: ctx.pois.map((p) => ({
      id: p.id, nome: p.name, categoria: p.category, durata: p.durationMin, costo: p.cost, apre: p.opening.open, chiude: p.opening.close, momento: p.bestTime ?? null, tag: p.tags,
    })),
  });
}

/** Etichetta leggibile e verifica che gli id esistano davvero nel contesto. */
export function describeOperation(op: AssistantOperation, ctx: AssistantContext): string | null {
  const acts = ctx.trip?.itinerary?.days.flatMap((d) => d.activities) ?? [];
  const act = (id: string) => acts.find((a) => a.id === id);
  const poi = (id: string | null) => (id ? ctx.pois.find((p) => p.id === id) : undefined);
  const days = ctx.trip?.itinerary?.days.length ?? 0;
  switch (op.type) {
    case "add_activity": {
      if (!ctx.trip?.itinerary || op.dayIndex >= days) return null;
      const name = poi(op.poiId)?.name ?? op.title;
      if (!name) return null;
      return `Aggiungi "${name}" al giorno ${op.dayIndex + 1}${op.startTime ? ` alle ${op.startTime}` : ""}`;
    }
    case "remove_activity":
      return act(op.activityId) ? `Rimuovi "${act(op.activityId)!.title}"` : null;
    case "replace_activity": {
      const a = act(op.activityId);
      const p = poi(op.poiId);
      if (!a || !p) return null;
      const diff = a.cost - p.cost;
      return `Sostituisci "${a.title}" con "${p.name}"${diff > 0 ? ` (risparmi ${formatPrice(diff)} a persona)` : ""}`;
    }
    case "move_activity":
      return act(op.activityId) && op.toDayIndex < days ? `Sposta "${act(op.activityId)!.title}" al giorno ${op.toDayIndex + 1}` : null;
    case "update_activity": {
      const a = act(op.activityId);
      if (!a) return null;
      const parts = [op.startTime && `alle ${op.startTime}`, op.durationMin && `durata ${op.durationMin} min`, op.notes && "nota aggiornata"].filter(Boolean);
      return `Modifica "${a.title}": ${parts.join(", ") || "dettagli"}`;
    }
    case "regenerate_day":
      return op.dayIndex < days ? `Riorganizza il giorno ${op.dayIndex + 1} con ritmo ${op.pace}` : null;
    case "create_trip": {
      const d = ctx.destinations.find((x) => x.id === op.destinationId);
      return d ? `Crea un viaggio di ${op.days} giorni a ${d.name}${op.budgetPerPerson ? ` con ${formatPrice(op.budgetPerPerson)} a persona` : ""}` : null;
    }
  }
}

export function toProposals(ops: AssistantOperation[], ctx: AssistantContext): AssistantProposal[] {
  return ops.flatMap((operation, i) => {
    const label = describeOperation(operation, ctx);
    return label ? [{ id: `p${i}-${operation.type}`, label, operation }] : [];
  });
}
