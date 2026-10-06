import { z } from "zod";
import { tripPaceSchema } from "@/lib/validation";
import { limitOrThrow, readJson, requireApiUser, route } from "@/server/http";
import { regenerateDay } from "@/server/services/itinerary";

export const POST = route<{ id: string; dayId: string }>(async (req, { id, dayId }) => {
  const user = await requireApiUser();
  limitOrThrow(`generate:${user.id}`, 20, 60_000);
  const { pace } = z.object({ pace: tripPaceSchema.optional() }).parse(await readJson(req));
  return { itinerary: await regenerateDay(user.id, id, dayId, { pace }) };
});
