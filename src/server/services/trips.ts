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

export async function listTrips(userId: string): Promise<TripSummary[]> {
  const rows = await db.select().from(schema.trips).where(eq(schema.trips.userId, userId)).orderBy(desc(schema.trips.updatedAt));
  return rows.map(toSummary);
}

export async function getTripDetail(userId: string, tripId: string): Promise<TripDetail> {
  const row = await getOwnedTripRow(userId, tripId);
  const [travelerRows, flightRows, stayRow, expenseRows, itinerary, dest] = await Promise.all([
    db.select().from(schema.travelers).where(eq(schema.travelers.tripId, tripId)),
    db.select().from(schema.tripFlights).where(eq(schema.tripFlights.tripId, tripId)),
    db.select().from(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId)).limit(1).then((r) => r[0]),
    db.select().from(schema.expenses).where(eq(schema.expenses.tripId, tripId)).orderBy(asc(schema.expenses.createdAt)),
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
  await db.transaction(async (tx) => {
    await tx.insert(schema.trips)
      .values({
        id: tripId, userId: user.id, name: input.name, destinationId: dest.id, destinationName: dest.name, country: dest.country,
        countryCode: dest.countryCode, destinationLat: dest.location.lat, destinationLng: dest.location.lng, imageUrl: dest.imageUrl,
        originCode: input.originCode ?? null, startDate: input.startDate, endDate: input.endDate, travelersCount: input.travelersCount,
        budgetPerPerson: input.budgetPerPerson ?? null, pace: input.pace,
      });
    const names = [user.name, ...input.travelerNames.filter(Boolean)].slice(0, input.travelersCount);
    while (names.length < input.travelersCount) names.push(`Viaggiatore ${names.length + 1}`);
    await tx.insert(schema.travelers).values(names.map((name, i) => ({ tripId, name, isOwner: i === 0 })));
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
  const row = await getOwnedTripRow(userId, tripId);
  const input = tripInputSchema.parse(rawInput);
  const dest = input.destinationId === row.destinationId ? null : await destinations.get(input.destinationId);
  if (input.destinationId !== row.destinationId && !dest) throw new AppError("validation", "Destinazione non valida");

  await db.transaction(async (tx) => {
    await tx.update(schema.trips)
      .set({
        name: input.name, originCode: input.originCode ?? null, startDate: input.startDate, endDate: input.endDate,
        travelersCount: input.travelersCount, budgetPerPerson: input.budgetPerPerson ?? null, pace: input.pace,
        ...(dest && {
          destinationId: dest.id, destinationName: dest.name, country: dest.country, countryCode: dest.countryCode,
          destinationLat: dest.location.lat, destinationLng: dest.location.lng, imageUrl: dest.imageUrl,
        }),
      })
      .where(eq(schema.trips.id, tripId));

    if (dest) {
      // Nuova destinazione: voli, alloggio e itinerario precedenti non hanno più senso
      await tx.delete(schema.tripFlights).where(eq(schema.tripFlights.tripId, tripId));
      await tx.delete(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId));
      await tx.delete(schema.itineraries).where(eq(schema.itineraries.tripId, tripId));
      return;
    }
    if (input.startDate !== row.startDate || input.endDate !== row.endDate) {
      await syncItineraryDays(tx, tripId, input.startDate, input.endDate);
    }
    // Allinea il numero di partecipanti
    const current = await tx.select().from(schema.travelers).where(eq(schema.travelers.tripId, tripId));
    if (current.length < input.travelersCount) {
      await tx.insert(schema.travelers)
        .values(Array.from({ length: input.travelersCount - current.length }, (_, i) => ({ tripId, name: `Viaggiatore ${current.length + i + 1}` })));
    } else if (current.length > input.travelersCount) {
      const removable = current.filter((t) => !t.isOwner).slice(input.travelersCount - current.length);
      if (removable.length) await tx.delete(schema.travelers).where(inArray(schema.travelers.id, removable.map((t) => t.id)));
    }
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Dopo un cambio date: mantiene le giornate esistenti per indice, aggiunge o rimuove le eccedenti. */
async function syncItineraryDays(tx: Tx, tripId: string, startDate: string, endDate: string) {
  const itin = await tx.select().from(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).limit(1).then((r) => r[0]);
  if (!itin) return;
  const days = await tx.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, itin.id)).orderBy(asc(schema.itineraryDays.dayIndex));
  const total = diffDays(startDate, endDate) + 1;
  for (const d of days) {
    if (d.dayIndex >= total) await tx.delete(schema.itineraryDays).where(eq(schema.itineraryDays.id, d.id));
    else await tx.update(schema.itineraryDays).set({ date: addDays(startDate, d.dayIndex) }).where(eq(schema.itineraryDays.id, d.id));
  }
  for (let i = days.length; i < total; i++) {
    await tx.insert(schema.itineraryDays).values({ itineraryId: itin.id, dayIndex: i, date: addDays(startDate, i), title: "Giornata libera" });
  }
}

export async function setTripStatus(userId: string, tripId: string, status: TripStatus): Promise<void> {
  await getOwnedTripRow(userId, tripId);
  await db.update(schema.trips).set({ status }).where(eq(schema.trips.id, tripId));
}

export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  await getOwnedTripRow(userId, tripId);
  await db.delete(schema.trips).where(eq(schema.trips.id, tripId));
}

export async function duplicateTrip(userId: string, tripId: string): Promise<string> {
  const row = await getOwnedTripRow(userId, tripId);
  const newId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
    await tx.insert(schema.trips).values({ ...rest, id: newId, name: `${row.name} (copia)`, status: "pianificazione" });
    for (const t of await tx.select().from(schema.travelers).where(eq(schema.travelers.tripId, tripId))) {
      await tx.insert(schema.travelers).values({ ...t, id: crypto.randomUUID(), tripId: newId });
    }
    for (const f of await tx.select().from(schema.tripFlights).where(eq(schema.tripFlights.tripId, tripId))) {
      await tx.insert(schema.tripFlights).values({ ...f, id: crypto.randomUUID(), tripId: newId });
    }
    for (const a of await tx.select().from(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId))) {
      await tx.insert(schema.tripAccommodations).values({ ...a, id: crypto.randomUUID(), tripId: newId });
    }
    const itin = await tx.select().from(schema.itineraries).where(eq(schema.itineraries.tripId, tripId)).limit(1).then((r) => r[0]);
    if (itin) {
      const newItinId = crypto.randomUUID();
      await tx.insert(schema.itineraries).values({ ...itin, id: newItinId, tripId: newId });
      for (const d of await tx.select().from(schema.itineraryDays).where(eq(schema.itineraryDays.itineraryId, itin.id))) {
        const newDayId = crypto.randomUUID();
        await tx.insert(schema.itineraryDays).values({ ...d, id: newDayId, itineraryId: newItinId });
        const acts = await tx.select().from(schema.activities).where(eq(schema.activities.dayId, d.id));
        if (acts.length) await tx.insert(schema.activities).values(acts.map((a) => ({ ...a, id: crypto.randomUUID(), dayId: newDayId })));
      }
    }
  });
  return newId;
}

// ───────── Voli e alloggio: il prezzo arriva sempre dal provider, mai dal client ─────────

export async function setFlight(userId: string, tripId: string, offerId: string, direction: "andata" | "ritorno"): Promise<void> {
  await getOwnedTripRow(userId, tripId);
  const offer = await flights.getOffer(offerId);
  if (!offer) throw new AppError("not_found", "Questa offerta non è più disponibile. Ripeti la ricerca.");
  await db.transaction(async (tx) => {
    await tx.delete(schema.tripFlights).where(and(eq(schema.tripFlights.tripId, tripId), eq(schema.tripFlights.direction, direction)));
    await tx.insert(schema.tripFlights)
      .values({
        tripId, direction, provider: offer.provider, offerId: offer.id, airline: offer.airline, airlineCode: offer.airlineCode,
        flightNumber: offer.flightNumber, fromCode: offer.fromCode, toCode: offer.toCode, departAt: offer.departAt, arriveAt: offer.arriveAt,
        durationMin: offer.durationMin, stops: offer.stops, pricePerPerson: offer.price, baggage: offer.baggage, conditions: offer.conditions,
        bookingRef: offer.bookingRef ?? null,
      });
    if (direction === "andata") await tx.update(schema.trips).set({ originCode: offer.fromCode }).where(eq(schema.trips.id, tripId));
  });
}

export async function removeFlight(userId: string, tripId: string, flightId: string): Promise<void> {
  await getOwnedTripRow(userId, tripId);
  await db.delete(schema.tripFlights).where(and(eq(schema.tripFlights.id, flightId), eq(schema.tripFlights.tripId, tripId)));
}

export async function setAccommodation(userId: string, tripId: string, offerId: string): Promise<void> {
  await getOwnedTripRow(userId, tripId);
  const offer = await accommodations.getOffer(offerId);
  if (!offer) throw new AppError("not_found", "Questa struttura non è più disponibile. Ripeti la ricerca.");
  await db.transaction(async (tx) => {
    await tx.delete(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId));
    await tx.insert(schema.tripAccommodations)
      .values({
        tripId, provider: offer.provider, offerId: offer.id, name: offer.name, type: offer.type, neighborhood: offer.neighborhood,
        lat: offer.location.lat, lng: offer.location.lng, rating: offer.rating, reviewsCount: offer.reviewsCount,
        pricePerNight: offer.pricePerNight, priceTotal: offer.priceTotal, checkIn: offer.checkIn, checkOut: offer.checkOut,
        freeCancellation: offer.freeCancellation, imageUrl: offer.imageUrl, bookingRef: offer.bookingRef ?? null,
      });
  });
}

export async function removeAccommodation(userId: string, tripId: string): Promise<void> {
  await getOwnedTripRow(userId, tripId);
  await db.delete(schema.tripAccommodations).where(eq(schema.tripAccommodations.tripId, tripId));
}

// ───────── Spese ─────────

export async function addExpense(userId: string, tripId: string, raw: z.input<typeof expenseInputSchema>): Promise<TripExpense> {
  await getOwnedTripRow(userId, tripId);
  const input = expenseInputSchema.parse(raw);
  const row = await db.insert(schema.expenses).values({ tripId, ...input, spentAt: input.spentAt ?? null }).returning().then((r) => r[0]);
  return { id: row.id, category: row.category, label: row.label, amount: row.amount, spentAt: row.spentAt };
}

export async function deleteExpense(userId: string, tripId: string, expenseId: string): Promise<void> {
  await getOwnedTripRow(userId, tripId);
  await db.delete(schema.expenses).where(and(eq(schema.expenses.id, expenseId), eq(schema.expenses.tripId, tripId)));
}
