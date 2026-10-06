import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { TripDetail, TripExpense, TripFlight, TripStay, TripSummary } from "@/lib/dto";
import type { TripStatus } from "@/lib/types";
import { addDays, diffDays, todayISO } from "@/lib/time";
import { draftSelectionSchema, expenseInputSchema, tripInputSchema } from "@/lib/validation";
import { db, schema } from "@/server/db";
import type { TripRow } from "@/server/db/schema";
import { accommodations, destinations, flights } from "@/server/providers";
import { AppError } from "./errors";
import { getOwnedTripRow } from "./ownership";
import { loadItinerary } from "./itinerary";

export type TripInput = z.input<typeof tripInputSchema>;

/** Stato effettivo: un viaggio confermato diventa "in corso" e poi "completato" con le date. */
function effectiveStatus(row: Pick<TripRow, "status" | "startDate" | "endDate">): TripStatus {
  const today = todayISO();
  if (row.status === "completato") return row.status;
  if (today > row.endDate) return "completato";
  if (today >= row.startDate && row.status === "confermato") return "in_corso";
  return row.status;
}

export function toSummary(row: TripRow): TripSummary {
  return {
    id: row.id,
    name: row.name,
    destinationId: row.destinationId,
    destinationName: row.destinationName,
    country: row.country,
    countryCode: row.countryCode,
    location: { lat: row.destinationLat, lng: row.destinationLng },
    imageUrl: row.imageUrl,
    originCode: row.originCode,
    startDate: row.startDate,
    endDate: row.endDate,
    travelersCount: row.travelersCount,
    budgetPerPerson: row.budgetPerPerson,
    pace: row.pace,
    status: effectiveStatus(row),
    updatedAt: row.updatedAt,
  };
}

export function listTrips(userId: string): TripSummary[] {
  return db.select().from(schema.trips).where(eq(schema.trips.userId, userId)).orderBy(desc(schema.trips.updatedAt)).all().map(toSummary);
}

export async function getTripDetail(userId: string, tripId: string): Promise<TripDetail> {
  const row = getOwnedTripRow(userId, tripId);
  const [travelerRows, flightRows, stayRow, expenseRows, itinerary, dest] = await Promise.all([
    db.select().from(schema.travelers).where(eq(schema.travelers.tripId, tripId)).all(),
    db.select().from(schema.tripFlights).where(eq(schema.tripFlights.tripId, tripId)).all(),
    db.select().from(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId)).get(),
    db.select().from(schema.expenses).where(eq(schema.expenses.tripId, tripId)).orderBy(asc(schema.expenses.createdAt)).all(),
    loadItinerary(tripId),
    destinations.get(row.destinationId),
  ]);

  const flightsDto: TripFlight[] = flightRows
    .map((f) => ({
      id: f.id, direction: f.direction, offerId: f.offerId, airline: f.airline, airlineCode: f.airlineCode, flightNumber: f.flightNumber,
      fromCode: f.fromCode, toCode: f.toCode, departAt: f.departAt, arriveAt: f.arriveAt, durationMin: f.durationMin, stops: f.stops,
      pricePerPerson: f.pricePerPerson, canBook: !!f.bookingRef, baggage: f.baggage, conditions: f.conditions,
    }))
    .sort((a) => (a.direction === "andata" ? -1 : 1));

  const stay: TripStay | null = stayRow
    ? {
        id: stayRow.id, offerId: stayRow.offerId, name: stayRow.name, type: stayRow.type, neighborhood: stayRow.neighborhood,
        location: { lat: stayRow.lat, lng: stayRow.lng }, rating: stayRow.rating, reviewsCount: stayRow.reviewsCount,
        pricePerNight: stayRow.pricePerNight, priceTotal: stayRow.priceTotal, checkIn: stayRow.checkIn, checkOut: stayRow.checkOut,
        freeCancellation: stayRow.freeCancellation, imageUrl: stayRow.imageUrl, canBook: !!stayRow.bookingRef,
      }
    : null;

  const expensesDto: TripExpense[] = expenseRows.map((e) => ({ id: e.id, category: e.category, label: e.label, amount: e.amount, spentAt: e.spentAt }));

  return {
    ...toSummary(row),
    travelers: travelerRows.map((t) => ({ id: t.id, name: t.name, isOwner: t.isOwner })),
    flights: flightsDto,
    stay,
    itinerary,
    expenses: expensesDto,
    destinationDailyCost: dest?.dailyCost ?? 40,
  };
}

export async function createTrip(
  user: { id: string; name: string },
  rawInput: TripInput,
  rawSelection?: z.input<typeof draftSelectionSchema>,
): Promise<string> {
  const input = tripInputSchema.parse(rawInput);
  const dest = await destinations.get(input.destinationId);
  if (!dest) throw new AppError("validation", "Destinazione non valida");

  const tripId = crypto.randomUUID();
  db.transaction((tx) => {
    tx.insert(schema.trips)
      .values({
        id: tripId, userId: user.id, name: input.name, destinationId: dest.id, destinationName: dest.name, country: dest.country,
        countryCode: dest.countryCode, destinationLat: dest.location.lat, destinationLng: dest.location.lng, imageUrl: dest.imageUrl,
        originCode: input.originCode ?? null, startDate: input.startDate, endDate: input.endDate, travelersCount: input.travelersCount,
        budgetPerPerson: input.budgetPerPerson ?? null, pace: input.pace,
      })
      .run();
    const names = [user.name, ...input.travelerNames.filter(Boolean)].slice(0, input.travelersCount);
    while (names.length < input.travelersCount) names.push(`Viaggiatore ${names.length + 1}`);
    tx.insert(schema.travelers).values(names.map((name, i) => ({ tripId, name, isOwner: i === 0 }))).run();
  });

  if (rawSelection) {
    const sel = draftSelectionSchema.parse(rawSelection);
    // Le selezioni fatte prima del login: errori non bloccanti (l'offerta può essere scaduta)
    await Promise.allSettled([
      sel.outboundOfferId && setFlight(user.id, tripId, sel.outboundOfferId, "andata"),
      sel.returnOfferId && setFlight(user.id, tripId, sel.returnOfferId, "ritorno"),
      sel.accommodationOfferId && setAccommodation(user.id, tripId, sel.accommodationOfferId),
    ]);
  }
  return tripId;
}

export async function updateTrip(userId: string, tripId: string, rawInput: TripInput): Promise<void> {
  const row = getOwnedTripRow(userId, tripId);
  const input = tripInputSchema.parse(rawInput);
  const dest = input.destinationId === row.destinationId ? null : await destinations.get(input.destinationId);
  if (input.destinationId !== row.destinationId && !dest) throw new AppError("validation", "Destinazione non valida");

  db.transaction((tx) => {
    tx.update(schema.trips)
      .set({
        name: input.name, originCode: input.originCode ?? null, startDate: input.startDate, endDate: input.endDate,
        travelersCount: input.travelersCount, budgetPerPerson: input.budgetPerPerson ?? null, pace: input.pace,
        ...(dest && {
          destinationId: dest.id, destinationName: dest.name, country: dest.country, countryCode: dest.countryCode,
          destinationLat: dest.location.lat, destinationLng: dest.location.lng, imageUrl: dest.imageUrl,
        }),
      })
      .where(eq(schema.trips.id, tripId))
      .run();

    if (dest) {
      // Nuova destinazione: voli, alloggio e itinerario precedenti non hanno più senso
      tx.delete(schema.tripFlights).where(eq(schema.tripFlights.tripId, tripId)).run();
      tx.delete(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId)).run();
      tx.delete(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).run();
      return;
    }
    if (input.startDate !== row.startDate || input.endDate !== row.endDate) {
      syncItineraryDays(tx, tripId, input.startDate, input.endDate);
    }
    // Allinea il numero di partecipanti
    const current = tx.select().from(schema.travelers).where(eq(schema.travelers.tripId, tripId)).all();
    if (current.length < input.travelersCount) {
      tx.insert(schema.travelers)
        .values(Array.from({ length: input.travelersCount - current.length }, (_, i) => ({ tripId, name: `Viaggiatore ${current.length + i + 1}` })))
        .run();
    } else if (current.length > input.travelersCount) {
      const removable = current.filter((t) => !t.isOwner).slice(input.travelersCount - current.length);
      if (removable.length) tx.delete(schema.travelers).where(inArray(schema.travelers.id, removable.map((t) => t.id))).run();
    }
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Dopo un cambio date: mantiene le giornate esistenti per indice, aggiunge o rimuove le eccedenti. */
function syncItineraryDays(tx: Tx, tripId: string, startDate: string, endDate: string) {
  const itin = tx.select().from(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).get();
  if (!itin) return;
  const days = tx.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, itin.id)).orderBy(asc(schema.itineraryDays.dayIndex)).all();
  const total = diffDays(startDate, endDate) + 1;
  for (const d of days) {
    if (d.dayIndex >= total) tx.delete(schema.itineraryDays).where(eq(schema.itineraryDays.id, d.id)).run();
    else tx.update(schema.itineraryDays).set({ date: addDays(startDate, d.dayIndex) }).where(eq(schema.itineraryDays.id, d.id)).run();
  }
  for (let i = days.length; i < total; i++) {
    tx.insert(schema.itineraryDays).values({ itineraryId: itin.id, dayIndex: i, date: addDays(startDate, i), title: "Giornata libera" }).run();
  }
}

export function setTripStatus(userId: string, tripId: string, status: TripStatus): void {
  getOwnedTripRow(userId, tripId);
  db.update(schema.trips).set({ status }).where(eq(schema.trips.id, tripId)).run();
}

export function deleteTrip(userId: string, tripId: string): void {
  getOwnedTripRow(userId, tripId);
  db.delete(schema.trips).where(eq(schema.trips.id, tripId)).run();
}

export function duplicateTrip(userId: string, tripId: string): string {
  const row = getOwnedTripRow(userId, tripId);
  const newId = crypto.randomUUID();
  db.transaction((tx) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
    tx.insert(schema.trips).values({ ...rest, id: newId, name: `${row.name} (copia)`, status: "pianificazione" }).run();
    for (const t of tx.select().from(schema.travelers).where(eq(schema.travelers.tripId, tripId)).all()) {
      tx.insert(schema.travelers).values({ ...t, id: crypto.randomUUID(), tripId: newId }).run();
    }
    for (const f of tx.select().from(schema.tripFlights).where(eq(schema.tripFlights.tripId, tripId)).all()) {
      tx.insert(schema.tripFlights).values({ ...f, id: crypto.randomUUID(), tripId: newId }).run();
    }
    for (const a of tx.select().from(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId)).all()) {
      tx.insert(schema.tripAccommodations).values({ ...a, id: crypto.randomUUID(), tripId: newId }).run();
    }
    const itin = tx.select().from(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).get();
    if (itin) {
      const newItinId = crypto.randomUUID();
      tx.insert(schema.itineraries).values({ ...itin, id: newItinId, tripId: newId }).run();
      for (const d of tx.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, itin.id)).all()) {
        const newDayId = crypto.randomUUID();
        tx.insert(schema.itineraryDays).values({ ...d, id: newDayId, itineraryId: newItinId }).run();
        const acts = tx.select().from(schema.activities).where(eq(schema.activities.dayId, d.id)).all();
        if (acts.length) tx.insert(schema.activities).values(acts.map((a) => ({ ...a, id: crypto.randomUUID(), dayId: newDayId }))).run();
      }
    }
  });
  return newId;
}

// ───────── Voli e alloggio: il prezzo arriva sempre dal provider, mai dal client ─────────

export async function setFlight(userId: string, tripId: string, offerId: string, direction: "andata" | "ritorno"): Promise<void> {
  getOwnedTripRow(userId, tripId);
  const offer = await flights.getOffer(offerId);
  if (!offer) throw new AppError("not_found", "Questa offerta non è più disponibile. Ripeti la ricerca.");
  db.transaction((tx) => {
    tx.delete(schema.tripFlights).where(and(eq(schema.tripFlights.tripId, tripId), eq(schema.tripFlights.direction, direction))).run();
    tx.insert(schema.tripFlights)
      .values({
        tripId, direction, provider: offer.provider, offerId: offer.id, airline: offer.airline, airlineCode: offer.airlineCode,
        flightNumber: offer.flightNumber, fromCode: offer.fromCode, toCode: offer.toCode, departAt: offer.departAt, arriveAt: offer.arriveAt,
        durationMin: offer.durationMin, stops: offer.stops, pricePerPerson: offer.price, baggage: offer.baggage, conditions: offer.conditions,
        bookingRef: offer.bookingRef ?? null,
      })
      .run();
    if (direction === "andata") tx.update(schema.trips).set({ originCode: offer.fromCode }).where(eq(schema.trips.id, tripId)).run();
  });
}

export function removeFlight(userId: string, tripId: string, flightId: string): void {
  getOwnedTripRow(userId, tripId);
  db.delete(schema.tripFlights).where(and(eq(schema.tripFlights.id, flightId), eq(schema.tripFlights.tripId, tripId))).run();
}

export async function setAccommodation(userId: string, tripId: string, offerId: string): Promise<void> {
  getOwnedTripRow(userId, tripId);
  const offer = await accommodations.getOffer(offerId);
  if (!offer) throw new AppError("not_found", "Questa struttura non è più disponibile. Ripeti la ricerca.");
  db.transaction((tx) => {
    tx.delete(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId)).run();
    tx.insert(schema.tripAccommodations)
      .values({
        tripId, provider: offer.provider, offerId: offer.id, name: offer.name, type: offer.type, neighborhood: offer.neighborhood,
        lat: offer.location.lat, lng: offer.location.lng, rating: offer.rating, reviewsCount: offer.reviewsCount,
        pricePerNight: offer.pricePerNight, priceTotal: offer.priceTotal, checkIn: offer.checkIn, checkOut: offer.checkOut,
        freeCancellation: offer.freeCancellation, imageUrl: offer.imageUrl, bookingRef: offer.bookingRef ?? null,
      })
      .run();
  });
}

export function removeAccommodation(userId: string, tripId: string): void {
  getOwnedTripRow(userId, tripId);
  db.delete(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId)).run();
}

// ───────── Spese ─────────

export function addExpense(userId: string, tripId: string, raw: z.input<typeof expenseInputSchema>): TripExpense {
  getOwnedTripRow(userId, tripId);
  const input = expenseInputSchema.parse(raw);
  const row = db.insert(schema.expenses).values({ tripId, ...input, spentAt: input.spentAt ?? null }).returning().get();
  return { id: row.id, category: row.category, label: row.label, amount: row.amount, spentAt: row.spentAt };
}

export function deleteExpense(userId: string, tripId: string, expenseId: string): void {
  getOwnedTripRow(userId, tripId);
  db.delete(schema.expenses).where(and(eq(schema.expenses.id, expenseId), eq(schema.expenses.tripId, tripId))).run();
}
