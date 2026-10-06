import "server-only";
import { and, eq } from "drizzle-orm";
import type { BookingOption, BookingRef } from "@/lib/types";
import { db, schema } from "@/server/db";
import { accommodations, flights } from "@/server/providers";
import { withTimeout } from "@/server/providers/errors";
import { AppError } from "./errors";
import { getOwnedTripRow } from "./ownership";

export type BookingKind = "flight" | "stay";

async function optionsFor(kind: BookingKind, ref: BookingRef | null | undefined): Promise<BookingOption[]> {
  if (!ref) throw new AppError("not_found", "Questa offerta non ha più un riferimento di prenotazione. Ripeti la ricerca.");
  const provider = kind === "flight" ? flights : accommodations;
  return withTimeout(provider.getBookingOptions(ref), 30_000);
}

/** Venditori per un'offerta appena cercata (id letto dalla cache delle offerte, mai fidandosi del client). */
export async function bookingOptionsForOffer(kind: BookingKind, offerId: string): Promise<BookingOption[]> {
  const offer = await (kind === "flight" ? flights.getOffer(offerId) : accommodations.getOffer(offerId));
  if (!offer) throw new AppError("not_found", "Questa offerta non è più disponibile. Ripeti la ricerca.");
  return optionsFor(kind, offer.bookingRef);
}

/** Venditori per un volo o un alloggio già salvato in un viaggio dell'utente. */
export async function bookingOptionsForTripItem(userId: string, tripId: string, kind: BookingKind, itemId: string): Promise<BookingOption[]> {
  await getOwnedTripRow(userId, tripId);
  if (kind === "flight") {
    const [row] = await db.select().from(schema.tripFlights).where(and(eq(schema.tripFlights.id, itemId), eq(schema.tripFlights.tripId, tripId))).limit(1);
    if (!row) throw new AppError("not_found", "Volo non trovato");
    return optionsFor(kind, row.bookingRef);
  }
  const [row] = await db.select().from(schema.tripAccommodations).where(and(eq(schema.tripAccommodations.id, itemId), eq(schema.tripAccommodations.tripId, tripId))).limit(1);
  if (!row) throw new AppError("not_found", "Alloggio non trovato");
  return optionsFor(kind, row.bookingRef);
}
