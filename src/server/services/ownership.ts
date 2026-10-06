import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import type { TripRow } from "@/server/db/schema";
import { notFound } from "./errors";

/** Recupera il viaggio solo se appartiene all'utente (404 altrimenti: non riveliamo l'esistenza). */
export function getOwnedTripRow(userId: string, tripId: string): TripRow {
  const row = db.select().from(schema.trips).where(and(eq(schema.trips.id, tripId), eq(schema.trips.userId, userId))).get();
  if (!row) throw notFound("Viaggio");
  return row;
}

/** Tocca updatedAt del viaggio (ordinamento dashboard) */
export function touchTrip(tripId: string) {
  db.update(schema.trips).set({ updatedAt: new Date().toISOString() }).where(eq(schema.trips.id, tripId)).run();
}
