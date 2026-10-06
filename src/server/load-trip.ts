import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/server/auth/session";
import { AppError } from "@/server/services/errors";
import { getTripDetail } from "@/server/services/trips";

/** Carica il viaggio dell'utente corrente (una volta per richiesta, condiviso tra layout e pagina). */
export const loadTrip = cache(async (tripId: string) => {
  const user = await requireUser(`/viaggi/${tripId}`);
  try {
    return { user, trip: await getTripDetail(user.id, tripId) };
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
});
