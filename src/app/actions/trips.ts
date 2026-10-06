"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TripStatus } from "@/lib/types";
import { tripStatusSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth/session";
import { createTrip, deleteTrip, duplicateTrip, setTripStatus, updateTrip, type TripInput } from "@/server/services/trips";
import { toFormState } from "./handle";
import type { FormState } from "./state";

function readTripForm(form: FormData): TripInput {
  const budget = String(form.get("budgetPerPerson") ?? "").trim();
  return {
    name: String(form.get("name") ?? ""),
    destinationId: String(form.get("destinationId") ?? ""),
    originCode: String(form.get("originCode") ?? ""),
    startDate: String(form.get("startDate") ?? ""),
    endDate: String(form.get("endDate") ?? ""),
    travelersCount: Number(form.get("travelersCount") ?? 1),
    budgetPerPerson: budget ? Number(budget) : undefined,
    pace: String(form.get("pace") ?? "bilanciato") as TripInput["pace"],
    travelerNames: form.getAll("travelerNames").map(String).filter(Boolean),
  };
}

export async function createTripAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/viaggi/nuovo");
  let id: string;
  try {
    id = await createTrip(user, readTripForm(form), {
      outboundOfferId: String(form.get("outboundOfferId") ?? "") || undefined,
      returnOfferId: String(form.get("returnOfferId") ?? "") || undefined,
      accommodationOfferId: String(form.get("accommodationOfferId") ?? "") || undefined,
    });
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath("/viaggi");
  redirect(`/viaggi/${id}?creato=1`);
}

export async function updateTripAction(tripId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  try {
    await updateTrip(user.id, tripId, readTripForm(form));
  } catch (e) {
    return toFormState(e);
  }
  revalidatePath(`/viaggi/${tripId}`);
  redirect(`/viaggi/${tripId}`);
}

export async function deleteTripAction(tripId: string) {
  const user = await requireUser();
  await deleteTrip(user.id, tripId);
  revalidatePath("/viaggi");
}

export async function duplicateTripAction(tripId: string) {
  const user = await requireUser();
  const id = await duplicateTrip(user.id, tripId);
  revalidatePath("/viaggi");
  return id;
}

export async function setTripStatusAction(tripId: string, status: TripStatus) {
  const user = await requireUser();
  await setTripStatus(user.id, tripId, tripStatusSchema.parse(status));
  revalidatePath(`/viaggi/${tripId}`);
  revalidatePath("/viaggi");
}
