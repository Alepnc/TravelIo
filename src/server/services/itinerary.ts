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
  const itin = await db.select().from(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).limit(1).then((r) => r[0]);
  if (!itin) return null;
  const days = await db.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, itin.id)).orderBy(asc(schema.itineraryDays.dayIndex));
  const acts = days.length
    ? await db.select().from(schema.activities).where(inArray(schema.activities.dayId, days.map((d) => d.id))).orderBy(asc(schema.activities.position))
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
    db.select().from(schema.tripFlights).where(eq(schema.tripFlights.tripId, trip.id)),
    db.select().from(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, trip.id)).limit(1).then((r) => r[0]),
    db.select().from(schema.preferences).where(eq(schema.preferences.userId, userId)).limit(1).then((r) => r[0]),
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

async function insertDraftActivities(tx: Tx, dayId: string, drafts: DraftActivity[], source: "generated" | "assistant" = "generated") {
  if (!drafts.length) return;
  await tx.insert(schema.activities)
    .values(
      drafts.map((a, i) => ({
        dayId, position: i, title: a.title, category: a.category, startTime: a.startTime, durationMin: a.durationMin,
        placeName: a.placeName, lat: a.lat, lng: a.lng, cost: a.cost, notes: a.notes, poiId: a.poiId, source,
        timeLocked: a.timeLocked, isUserModified: false,
      })),
    );
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
  const trip = await getOwnedTripRow(userId, tripId);
  const ctx = await buildContext(trip, userId, opts.pace);
  const existing = await db.select().from(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).limit(1).then((r) => r[0]);
  const existingDays = existing
    ? await db.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, existing.id))
    : [];
  const preserved = opts.overwriteUserChanges ? [] : existingDays.filter((d) => d.isUserModified);
  const preservedActs = preserved.length
    ? await db.select().from(schema.activities).where(inArray(schema.activities.dayId, preserved.map((d) => d.id)))
    : [];

  const allIndexes = Array.from({ length: diffDays(trip.startDate, trip.endDate) + 1 }, (_, i) => i);
  const preservedIdx = new Set(preserved.map((d) => d.dayIndex));
  const drafts = generateItinerary({
    ...ctx,
    dayIndexes: allIndexes.filter((i) => !preservedIdx.has(i)),
    excludePoiIds: preservedActs.map((a) => a.poiId).filter((x): x is string => !!x),
  });

  await db.transaction(async (tx) => {
    let itineraryId = existing?.id;
    if (!itineraryId) {
      itineraryId = crypto.randomUUID();
      await tx.insert(schema.itineraries).values({ id: itineraryId, tripId, pace: ctx.pace, generatedAt: new Date().toISOString() });
    } else {
      await tx.update(schema.itineraries).set({ pace: ctx.pace, generatedAt: new Date().toISOString() }).where(eq(schema.itineraries.id, itineraryId));
      const toDelete = existingDays.filter((d) => !preservedIdx.has(d.dayIndex)).map((d) => d.id);
      if (toDelete.length) await tx.delete(schema.itineraryDays).where(inArray(schema.itineraryDays.id, toDelete));
    }
    for (const day of drafts) {
      const dayId = crypto.randomUUID();
      await tx.insert(schema.itineraryDays).values({ id: dayId, itineraryId, dayIndex: day.dayIndex, date: day.date, title: day.title });
      await insertDraftActivities(tx, dayId, day.activities);
    }
  });
  await touchTrip(tripId);
  return { itinerary: (await loadItinerary(tripId))!, preservedDays: preserved.length };
}

/** Rigenera una sola giornata. Le attività toccate dall'utente restano ferme; i POI degli altri giorni sono esclusi. */
export async function regenerateDay(userId: string, tripId: string, dayId: string, opts: { pace?: TripPace } = {}): Promise<Itinerary> {
  const trip = await getOwnedTripRow(userId, tripId);
  const { day, itinerary } = await getOwnedDay(tripId, dayId);
  const ctx = await buildContext(trip, userId, opts.pace);
  const allDays = await db.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, itinerary.id));
  const otherActs = await db
    .select()
    .from(schema.activities)
    .where(inArray(schema.activities.dayId, allDays.filter((d) => d.id !== dayId).map((d) => d.id).concat("__none__")));
  const dayActs = await db.select().from(schema.activities).where(eq(schema.activities.dayId, dayId));
  const fixed = dayActs.filter((a) => a.isUserModified || a.source === "user");

  const [draft] = generateItinerary({
    ...ctx,
    dayIndexes: [day.dayIndex],
    excludePoiIds: otherActs.map((a) => a.poiId).filter((x): x is string => !!x),
    fixedByDay: { [day.dayIndex]: fixed.map(rowToDraft) },
  });

  await db.transaction(async (tx) => {
    await tx.delete(schema.activities).where(eq(schema.activities.dayId, dayId));
    // Le attività fisse tornano con la loro identità e i loro flag
    const fixedByKey = new Map(fixed.map((a) => [`${a.title}|${a.startTime}`, a]));
    for (const [i, a] of draft.activities.entries()) {
      const keep = fixedByKey.get(`${a.title}|${a.startTime}`);
      if (keep) await tx.insert(schema.activities).values({ ...keep, position: i });
      else await insertDraftActivities(tx, dayId, [a]);
    }
    // insertDraftActivities usa posizione 0: riallinea l'ordine per orario
    const rows = await tx.select().from(schema.activities).where(eq(schema.activities.dayId, dayId));
    rows.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (const [i, r] of rows.entries()) await tx.update(schema.activities).set({ position: i }).where(eq(schema.activities.id, r.id));
    await tx.update(schema.itineraryDays).set({ title: draft.title, isUserModified: fixed.length > 0 }).where(eq(schema.itineraryDays.id, dayId));
  });
  await touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

// ───────── Modifiche manuali ─────────

async function getOwnedDay(tripId: string, dayId: string) {
  const row = await db
    .select({ day: schema.itineraryDays, itinerary: schema.itineraries })
    .from(schema.itineraryDays)
    .innerJoin(schema.itineraries, eq(schema.itineraries.id, schema.itineraryDays.itineraryId))
    .where(and(eq(schema.itineraryDays.id, dayId), eq(schema.itineraries.tripId, tripId)))
    .limit(1).then((r) => r[0]);
  if (!row) throw notFound("Giornata");
  return row;
}

async function getOwnedActivity(tripId: string, activityId: string) {
  const row = await db
    .select({ activity: schema.activities, day: schema.itineraryDays })
    .from(schema.activities)
    .innerJoin(schema.itineraryDays, eq(schema.itineraryDays.id, schema.activities.dayId))
    .innerJoin(schema.itineraries, eq(schema.itineraries.id, schema.itineraryDays.itineraryId))
    .where(and(eq(schema.activities.id, activityId), eq(schema.itineraries.tripId, tripId)))
    .limit(1).then((r) => r[0]);
  if (!row) throw notFound("Attività");
  return row;
}

/** Ricalcola gli orari di una giornata (stessa funzione usata dal client) e salva posizioni e orari. */
async function persistReflow(tx: Tx, dayId: string, orderedIds?: string[], dayStart?: string) {
  const rows = await tx.select().from(schema.activities).where(eq(schema.activities.dayId, dayId));
  const ordered = orderedIds
    ? orderedIds.map((id) => rows.find((r) => r.id === id)).filter((r): r is ActivityRow => !!r)
    : rows.sort((a, b) => a.position - b.position);
  const start = dayStart ?? (ordered.length ? ordered.reduce((m, r) => (r.startTime < m ? r.startTime : m), ordered[0].startTime) : undefined);
  const reflowed = reflowDay(ordered.map((r) => ({ ...r, travelMinFromPrev: null })), start);
  for (const [i, r] of reflowed.entries()) await tx.update(schema.activities).set({ position: i, startTime: r.startTime }).where(eq(schema.activities.id, r.id));
}

async function markDayModified(tx: Tx, dayId: string) {
  await tx.update(schema.itineraryDays).set({ isUserModified: true }).where(eq(schema.itineraryDays.id, dayId));
}

export async function createActivity(
  userId: string,
  tripId: string,
  raw: z.input<typeof activityInputSchema>,
  source: "user" | "assistant" = "user",
): Promise<Itinerary> {
  await getOwnedTripRow(userId, tripId);
  const input = activityInputSchema.parse(raw);
  await getOwnedDay(tripId, input.dayId);
  await db.transaction(async (tx) => {
    const existing = await tx.select().from(schema.activities).where(eq(schema.activities.dayId, input.dayId));
    await tx.insert(schema.activities)
      .values({
        dayId: input.dayId, position: existing.length, title: input.title, category: input.category, startTime: input.startTime,
        durationMin: input.durationMin, placeName: input.placeName ?? null, lat: input.lat ?? null, lng: input.lng ?? null,
        cost: input.cost, notes: input.notes ?? null, poiId: input.poiId ?? null, source, isUserModified: true,
        timeLocked: input.timeLocked ?? false,
      });
    // Inserimento in ordine cronologico
    const all = await tx.select().from(schema.activities).where(eq(schema.activities.dayId, input.dayId));
    all.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || a.position - b.position);
    for (const [i, r] of all.entries()) await tx.update(schema.activities).set({ position: i }).where(eq(schema.activities.id, r.id));
    await markDayModified(tx, input.dayId);
  });
  await touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

export async function updateActivity(userId: string, tripId: string, activityId: string, raw: z.input<typeof activityPatchSchema>): Promise<Itinerary> {
  await getOwnedTripRow(userId, tripId);
  const patch = activityPatchSchema.parse(raw);
  const { activity, day } = await getOwnedActivity(tripId, activityId);
  const targetDayId = patch.dayId ?? activity.dayId;
  if (targetDayId !== activity.dayId) await getOwnedDay(tripId, targetDayId);

  await db.transaction(async (tx) => {
    const timeChanged = patch.startTime !== undefined && patch.startTime !== activity.startTime;
    await tx.update(schema.activities)
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
      .where(eq(schema.activities.id, activityId));

    if (timeChanged) {
      const rows = await tx.select().from(schema.activities).where(eq(schema.activities.dayId, targetDayId));
      rows.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
      await persistReflow(tx, targetDayId, rows.map((r) => r.id));
    } else {
      await persistReflow(tx, targetDayId);
    }
    await markDayModified(tx, targetDayId);
    if (targetDayId !== day.id) {
      await persistReflow(tx, day.id);
      await markDayModified(tx, day.id);
    }
  });
  await touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

export async function deleteActivity(userId: string, tripId: string, activityId: string): Promise<Itinerary> {
  await getOwnedTripRow(userId, tripId);
  const { day } = await getOwnedActivity(tripId, activityId);
  await db.transaction(async (tx) => {
    await tx.delete(schema.activities).where(eq(schema.activities.id, activityId));
    // Non ricalcoliamo gli orari: togliere una tappa lascia tempo libero, non sposta le altre
    const rest = (await tx.select().from(schema.activities).where(eq(schema.activities.dayId, day.id))).sort((a, b) => a.position - b.position);
    for (const [i, r] of rest.entries()) await tx.update(schema.activities).set({ position: i }).where(eq(schema.activities.id, r.id));
    await markDayModified(tx, day.id);
  });
  await touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

/** Drag & drop: nuovo ordine (anche tra giornate diverse) + ricalcolo orari delle giornate toccate. */
export async function reorderItinerary(userId: string, tripId: string, raw: z.input<typeof reorderSchema>): Promise<Itinerary> {
  await getOwnedTripRow(userId, tripId);
  const { days } = reorderSchema.parse(raw);
  const itinerary = await loadItinerary(tripId);
  if (!itinerary) throw notFound("Itinerario");
  const validDays = new Map(itinerary.days.map((d) => [d.id, d]));
  const validActivities = new Map(itinerary.days.flatMap((d) => d.activities.map((a) => [a.id, a] as const)));
  for (const d of days) {
    if (!validDays.has(d.dayId)) throw notFound("Giornata");
    for (const id of d.activityIds) if (!validActivities.has(id)) throw notFound("Attività");
  }

  await db.transaction(async (tx) => {
    for (const d of days) {
      const before = validDays.get(d.dayId)!;
      const changed = before.activities.map((a) => a.id).join() !== d.activityIds.join();
      if (!changed) continue;
      for (const id of d.activityIds) await tx.update(schema.activities).set({ dayId: d.dayId }).where(eq(schema.activities.id, id));
      const moved = d.activityIds.filter((id) => validActivities.get(id)!.dayId !== d.dayId);
      if (moved.length) await tx.update(schema.activities).set({ isUserModified: true }).where(inArray(schema.activities.id, moved));
      await persistReflow(tx, d.dayId, d.activityIds, before.activities[0]?.startTime);
      await markDayModified(tx, d.dayId);
    }
  });
  await touchTrip(tripId);
  return (await loadItinerary(tripId))!;
}

export async function renameDay(userId: string, tripId: string, dayId: string, title: string): Promise<void> {
  await getOwnedTripRow(userId, tripId);
  await getOwnedDay(tripId, dayId);
  const clean = title.trim().slice(0, 80);
  if (!clean) throw new AppError("validation", "Il titolo non può essere vuoto");
  await db.update(schema.itineraryDays).set({ title: clean, isUserModified: true }).where(eq(schema.itineraryDays.id, dayId));
}
