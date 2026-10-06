import { z } from "zod";
import { tripPaceSchema } from "@/lib/validation";
import { limitOrThrow, readJson, requireApiUser, route } from "@/server/http";
import { generateItineraryForTrip, loadItinerary } from "@/server/services/itinerary";
import { getOwnedTripRow } from "@/server/services/ownership";

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireApiUser();
  getOwnedTripRow(user.id, id);
  return { itinerary: await loadItinerary(id) };
});

const body = z.object({ pace: tripPaceSchema.optional(), overwriteUserChanges: z.boolean().optional() });

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  limitOrThrow(`generate:${user.id}`, 20, 60_000);
  return generateItineraryForTrip(user.id, id, body.parse(await readJson(req)));
});
