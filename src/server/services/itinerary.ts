import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Itinerary, ItineraryActivity, TripPace } from "@/lib/types";
import { generateItinerary, type DraftActivity, type GenerateInput } from "@/lib/itinerary/generate";
import { reflowDay } from "@/lib/itinerary/reflow";
import { diffDays, toMinutes } from "@/lib/time";
import { activityInputSchema, activityPatchSchema, reorderSchema } from "@/lib/validation";
import { db, schema } from "@/server/db";
import type { ActivityRow, TripRow } from "@/server/db/schema";
import { activities as activityProvider, destinations, flights, maps } from "@/server/providers";
import { AppError, notFound } from "./errors";
import { getOwnedTripRow, touchTrip } from "./ownership";

// ───────── Lettura ─────────

function toActivity(a: ActivityRow): ItineraryActivity {
  return {
    id: a.id, dayId: a.dayId, position: a.position, title: a.title, category: a.category, startTime: a.startTime,
    durationMin: a.durationMin, placeName: a.placeName, lat: a.lat, lng: a.lng, cost: a.cost, notes: a.notes, poiId: a.poiId,
    source: a.source, isUserModified: a.isUserModified, timeLocked: a.timeLocked, travelMinFromPrev: null,
  };
}

export async function loadItinerary(tripId: string): Promise<Itinerary | null> {
  const itin = db.select().from(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).get();
  if (!itin) return null;
  const days = db.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, itin.id)).orderBy(asc(schema.itineraryDays.dayIndex)).all();
  const acts = days.length
    ? db.select().from(schema.activities).where(inArray(schema.activities.dayId, days.map((d) => d.id))).orderBy(asc(schema.activities.position)).all()
    : [];
  return {
    id: itin.id,
    tripId,
    pace: itin.pace,
    generatedAt: itin.generatedAt,
    days: days.map((d) => {
      const list = acts.filter((a) => a.dayId === d.id).map(toActivity);
      // travelMinFromPrev è un dato derivato: lo ricalcoliamo senza toccare gli orari salvati
      const withTravel = reflowDay(list).map((r, i) => ({ ...list[i], travelMinFromPrev: r.travelMinFromPrev }));
      return { id: d.id, dayIndex: d.dayIndex, date: d.date, title: d.title, isUserModified: d.isUserModified, activities: withTravel };
    }),
  };
}

// ───────── Generazione ─────────

async function buildContext(trip: TripRow, userId: string, pace?: TripPace): Promise<Omit<GenerateInput, "dayIndexes" | "excludePoiIds" | "fixedByDay">> {
  const [dest, pois, flightRows, stay, prefs] = await Promise.all([
    destinations.get(trip.destinationId),
    activityProvider.listForDestination(trip.destinationId),
    db.select().from(schema.tripFlights).where(eq(schema.tripFlights.tripId, trip.id)).all(),
    db.select().from(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, trip.id)).get(),
    db.select().from(schema.preferences).where(eq(schema.preferences.userId, userId)).get(),
  ]);
  if (!pois.length) throw new AppError("unavailable", "Non abbiamo ancora attività per questa destinazione. Puoi aggiungerle a mano.");

  const outbound = flightRows.find((f) => f.direction === "andata");
  const inbound = flightRows.find((f) => f.direction === "ritorno");
  const [arrAirport, depAirport] = await Promise.all([
    outbound ? flights.getAirport(outbound.toCode) : null,
    inbound ? flights.getAirport(inbound.fromCode) : null,
  ]);

  return {
    destinationName: trip.destinationName,
    center: { lat: trip.destinationLat, lng: trip.destinationLng },
    startDate: trip.startDate,
    endDate: trip.endDate,
    arrival: outbound && arrAirport ? { at: outbound.arriveAt, airportCode: outbound.toCode, airportLocation: arrAirport.location } : null,
    departure: inbound && depAirport ? { at: inbound.departAt, airportCode: inbound.fromCode, airportLocation: depAirport.location } : null,
    hotel: stay ? { name: stay.name, location: { lat: stay.lat, lng: stay.lng } } : null,
    pois,
    pace: pace ?? trip.pace,
    interests: prefs?.interests ?? [],
    budgetLevel: prefs?.budgetLevel ?? (trip.budgetPerPerson && trip.budgetPerPerson < 500 ? "basso" : "medio"),
    mealCost: Math.round((dest?.dailyCost ?? 40) * 0.35),
    travel: (a, b) => maps.estimate(a, b),
  };
}

function rowToDraft(a: ActivityRow): DraftActivity {
  return {
    title: a.title, category: a.category, startTime: a.startTime, durationMin: a.durationMin, placeName: a.placeName,
    lat: a.lat, lng: a.lng, cost: a.cost, notes: a.notes, poiId: a.poiId, timeLocked: true, travelMinFromPrev: null,
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function insertDraftActivities(tx: Tx, dayId: string, drafts: DraftActivity[], source: "generated" | "assistant" = "generated") {
  if (!drafts.length) return;
  tx.insert(schema.activities)
    .values(
      drafts.map((a, i) => ({
        dayId, position: i, title: a.title, category: a.category, startTime: a.startTime, durationMin: a.durationMin,
        placeName: a.placeName, lat: a.lat, lng: a.lng, cost: a.cost, notes: a.notes, poiId: a.poiId, source,
        timeLocked: a.timeLocked, isUserModified: false,
      })),
    )
    .run();
}

/**
 * Genera (o rigenera) l'intero itinerario.
 * Le giornate modificate dall'utente NON vengono toccate, salvo `overwriteUserChanges`.
 */
export async function generateItineraryForTrip(
  userId: string,
  tripId: string,
  opts: { pace?: TripPace; overwriteUserChanges?: boolean } = {},
): Promise<{ itinerary: Itinerary; preservedDays: number }> {
  const trip = getOwnedTripRow(userId, tripId);
  const ctx = await buildContext(trip, userId, opts.pace);
  const existing = db.select().from(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).get();
  const existingDays = existing
    ? db.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, existing.id)).all()
    : [];
  const preserved = opts.overwriteUserChanges ? [] : existingDays.filter((d) => d.isUserModified);
  const preservedActs = preserved.length
    ? db.select().from(schema.activities).where(inArray(schema.activities.dayId, preserved.map((d) => d.id))).all()
    : [];

  const allIndexes = Array.from({ length: diffDays(trip.startDate, trip.endDate) + 1 }, (_, i) => i);
  const preservedIdx = new Set(preserved.map((d) => d.dayIndex));
  const drafts = generateItinerary({
    ...ctx,
    dayIndexes: allIndexes.filter((i) => !preservedIdx.has(i)),
    excludePoiIds: preservedActs.map((a) => a.poiId).filter((x): x is string => !!x),
  });

  db.transaction((tx) => {
    let itineraryId = existing?.id;
    if (!itineraryId) {
      itineraryId = crypto.randomUUID();
      tx.insert(schema.itineraries).values({ id: itineraryId, tripId, pace: ctx.pace, generatedAt: new Date().toISOString() }).run();
    } else {
      tx.update(schema.itineraries).set({ pace: ctx.pace, generatedAt: new Date().toISOString() }).where(eq(schema.itineraries.id, itineraryId)).run();
      const toDelete = existingDays.filter((d) => !preservedIdx.has(d.dayIndex)).map((d) => d.id);
      if (toDelete.length) tx.delete(schema.itineraryDays).where(inArray(schema.itineraryDays.id, toDelete)).run();
    }
    for (const day of drafts) {
      const dayId = crypto.randomUUID();
      tx.insert(schema.itineraryDays).values({ id: dayId, itineraryId, dayIndex: day.dayIndex, date: day.date, title: day.title }).run();
      insertDraftActivities(tx, dayId, day.activities);
    }
  });
  touchTrip(tripId);
  return { itinerary: (await loadItinerary(tripId))!, preservedDays: preserved.length };
}

/** Rigenera una sola giornata. Le attività toccate dall'utente restano ferme; i POI degli altri giorni sono esclusi. */
export async function regenerateDay(userId: string, tripId: string, dayId: string, opts: { pace?: TripPace } = {}): Promise<Itinerary> {
  const trip = getOwnedTripRow(userId, tripId);
  const { day, itinerary } = getOwnedDay(tripId, dayId);
  const ctx = await buildContext(trip, userId, opts.pace);
  const allDays = db.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, itinerary.id)).all();
  const otherActs = db
    .select()
    .from(schema.activities)
    .where(inArray(schema.activities.dayId, allDays.filter((d) => d.id !== dayId).map((d) => d.id).concat("__none__")))
    .all();
  const dayActs = db.select().from(schema.activities).where(eq(schema.activities.dayId, dayId)).all();
  const fixed = dayActs.filter((a) => a.isUserModified || a.source === "user");

  const [draft] = generateItinerary({
    ...ctx,
    dayIndexes: [day.dayIndex],
    excludePoiIds: otherActs.map((a) => a.poiId).filter((x): x is string => !!x),
    fixedByDay: { [day.dayIndex]: fixed.map(rowToDraft) },
  });

  db.transaction((tx) => {
    tx.delete(schema.activities).where(eq(schema.activities.dayId, dayId)).run();
    // Le attività fisse tornano con la loro identità e i loro flag
    const fixedByKey = new Map(fixed.map((a) => [`${a.title}|${a.startTime}`, a]));
    draft.activities.forEach((a, i) => {
      const keep = fixedByKey.get(`${a.title}|${a.startTime}`);
      if (keep) tx.insert(schema.activities).values({ ...keep, position: i }).run();
      else insertDraftActivities(tx, dayId, [a]);
    });
    // insertDraftActivities usa posizione 0: riallinea l'ordine per orario
    const rows = tx.select().from(schema.activities).where(eq(schema.activities.dayId, dayId)).all();
    rows.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    rows.forEach((r, i) => tx.update(schema.activities).set({ position: i }).where(eq(schema.activities.id, r.id)).run());
    tx.update(schema.itineraryDays).set({ title: draft.title, isUserModified: fixed.length > 0 }).where(eq(schema.itineraryDays.id, dayId)).run();
  });
  touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

// ───────── Modifiche manuali ─────────

function getOwnedDay(tripId: string, dayId: string) {
  const row = db
    .select({ day: schema.itineraryDays, itinerary: schema.itineraries })
    .from(schema.itineraryDays)
    .innerJoin(schema.itineraries, eq(schema.itineraries.id, schema.itineraryDays.itineraryId))
    .where(and(eq(schema.itineraryDays.id, dayId), eq(schema.itineraries.tripId, tripId)))
    .get();
  if (!row) throw notFound("Giornata");
  return row;
}

function getOwnedActivity(tripId: string, activityId: string) {
  const row = db
    .select({ activity: schema.activities, day: schema.itineraryDays })
    .from(schema.activities)
    .innerJoin(schema.itineraryDays, eq(schema.itineraryDays.id, schema.activities.dayId))
    .innerJoin(schema.itineraries, eq(schema.itineraries.id, schema.itineraryDays.itineraryId))
    .where(and(eq(schema.activities.id, activityId), eq(schema.itineraries.tripId, tripId)))
    .get();
  if (!row) throw notFound("Attività");
  return row;
}

/** Ricalcola gli orari di una giornata (stessa funzione usata dal client) e salva posizioni e orari. */
function persistReflow(tx: Tx, dayId: string, orderedIds?: string[], dayStart?: string) {
  const rows = tx.select().from(schema.activities).where(eq(schema.activities.dayId, dayId)).all();
  const ordered = orderedIds
    ? orderedIds.map((id) => rows.find((r) => r.id === id)).filter((r): r is ActivityRow => !!r)
    : rows.sort((a, b) => a.position - b.position);
  const start = dayStart ?? (ordered.length ? ordered.reduce((m, r) => (r.startTime < m ? r.startTime : m), ordered[0].startTime) : undefined);
  const reflowed = reflowDay(ordered.map((r) => ({ ...r, travelMinFromPrev: null })), start);
  reflowed.forEach((r, i) => tx.update(schema.activities).set({ position: i, startTime: r.startTime }).where(eq(schema.activities.id, r.id)).run());
}

function markDayModified(tx: Tx, dayId: string) {
  tx.update(schema.itineraryDays).set({ isUserModified: true }).where(eq(schema.itineraryDays.id, dayId)).run();
}

export async function createActivity(
  userId: string,
  tripId: string,
  raw: z.input<typeof activityInputSchema>,
  source: "user" | "assistant" = "user",
): Promise<Itinerary> {
  getOwnedTripRow(userId, tripId);
  const input = activityInputSchema.parse(raw);
  getOwnedDay(tripId, input.dayId);
  db.transaction((tx) => {
    const existing = tx.select().from(schema.activities).where(eq(schema.activities.dayId, input.dayId)).all();
    tx.insert(schema.activities)
      .values({
        dayId: input.dayId, position: existing.length, title: input.title, category: input.category, startTime: input.startTime,
        durationMin: input.durationMin, placeName: input.placeName ?? null, lat: input.lat ?? null, lng: input.lng ?? null,
        cost: input.cost, notes: input.notes ?? null, poiId: input.poiId ?? null, source, isUserModified: true,
        timeLocked: input.timeLocked ?? false,
      })
      .run();
    // Inserimento in ordine cronologico
    const all = tx.select().from(schema.activities).where(eq(schema.activities.dayId, input.dayId)).all();
    all.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || a.position - b.position);
    all.forEach((r, i) => tx.update(schema.activities).set({ position: i }).where(eq(schema.activities.id, r.id)).run());
    markDayModified(tx, input.dayId);
  });
  touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

export async function updateActivity(userId: string, tripId: string, activityId: string, raw: z.input<typeof activityPatchSchema>): Promise<Itinerary> {
  getOwnedTripRow(userId, tripId);
  const patch = activityPatchSchema.parse(raw);
  const { activity, day } = getOwnedActivity(tripId, activityId);
  const targetDayId = patch.dayId ?? activity.dayId;
  if (targetDayId !== activity.dayId) getOwnedDay(tripId, targetDayId);

  db.transaction((tx) => {
    const timeChanged = patch.startTime !== undefined && patch.startTime !== activity.startTime;
    tx.update(schema.activities)
      .set({
        ...("title" in patch && { title: patch.title }),
        ...("category" in patch && { category: patch.category }),
        ...("startTime" in patch && { startTime: patch.startTime }),
        ...("durationMin" in patch && { durationMin: patch.durationMin }),
        ...("placeName" in patch && { placeName: patch.placeName ?? null }),
        ...("lat" in patch && { lat: patch.lat ?? null }),
        ...("lng" in patch && { lng: patch.lng ?? null }),
        ...("cost" in patch && { cost: patch.cost }),
        ...("notes" in patch && { notes: patch.notes ?? null }),
        dayId: targetDayId,
        position: targetDayId !== activity.dayId ? 999 : activity.position,
        isUserModified: true,
        // Cambiare l'orario a mano lo "fissa", a meno che l'utente non lo sblocchi esplicitamente
        timeLocked: patch.timeLocked ?? (timeChanged ? true : activity.timeLocked),
      })
      .where(eq(schema.activities.id, activityId))
      .run();

    if (timeChanged) {
      const rows = tx.select().from(schema.activities).where(eq(schema.activities.dayId, targetDayId)).all();
      rows.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
      persistReflow(tx, targetDayId, rows.map((r) => r.id));
    } else {
      persistReflow(tx, targetDayId);
    }
    markDayModified(tx, targetDayId);
    if (targetDayId !== day.id) {
      persistReflow(tx, day.id);
      markDayModified(tx, day.id);
    }
  });
  touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

export async function deleteActivity(userId: string, tripId: string, activityId: string): Promise<Itinerary> {
  getOwnedTripRow(userId, tripId);
  const { day } = getOwnedActivity(tripId, activityId);
  db.transaction((tx) => {
    tx.delete(schema.activities).where(eq(schema.activities.id, activityId)).run();
    // Non ricalcoliamo gli orari: togliere una tappa lascia tempo libero, non sposta le altre
    const rest = tx.select().from(schema.activities).where(eq(schema.activities.dayId, day.id)).all().sort((a, b) => a.position - b.position);
    rest.forEach((r, i) => tx.update(schema.activities).set({ position: i }).where(eq(schema.activities.id, r.id)).run());
    markDayModified(tx, day.id);
  });
  touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

/** Drag & drop: nuovo ordine (anche tra giornate diverse) + ricalcolo orari delle giornate toccate. */
export async function reorderItinerary(userId: string, tripId: string, raw: z.input<typeof reorderSchema>): Promise<Itinerary> {
  getOwnedTripRow(userId, tripId);
  const { days } = reorderSchema.parse(raw);
  const itinerary = await loadItinerary(tripId);
  if (!itinerary) throw notFound("Itinerario");
  const validDays = new Map(itinerary.days.map((d) => [d.id, d]));
  const validActivities = new Map(itinerary.days.flatMap((d) => d.activities.map((a) => [a.id, a] as const)));
  for (const d of days) {
    if (!validDays.has(d.dayId)) throw notFound("Giornata");
    for (const id of d.activityIds) if (!validActivities.has(id)) throw notFound("Attività");
  }

  db.transaction((tx) => {
    for (const d of days) {
      const before = validDays.get(d.dayId)!;
      const changed = before.activities.map((a) => a.id).join() !== d.activityIds.join();
      if (!changed) continue;
      for (const id of d.activityIds) tx.update(schema.activities).set({ dayId: d.dayId }).where(eq(schema.activities.id, id)).run();
      const moved = d.activityIds.filter((id) => validActivities.get(id)!.dayId !== d.dayId);
      if (moved.length) tx.update(schema.activities).set({ isUserModified: true }).where(inArray(schema.activities.id, moved)).run();
      persistReflow(tx, d.dayId, d.activityIds, before.activities[0]?.startTime);
      markDayModified(tx, d.dayId);
    }
  });
  touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

export async function renameDay(userId: string, tripId: string, dayId: string, title: string): Promise<void> {
  getOwnedTripRow(userId, tripId);
  getOwnedDay(tripId, dayId);
  const clean = title.trim().slice(0, 80);
  if (!clean) throw new AppError("validation", "Il titolo non può essere vuoto");
  db.update(schema.itineraryDays).set({ title: clean, isUserModified: true }).where(eq(schema.itineraryDays.id, dayId)).run();
}
