import { readJson, requireApiUser, route } from "@/server/http";
import { reorderItinerary } from "@/server/services/itinerary";

export const PUT = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  return { itinerary: await reorderItinerary(user.id, id, (await readJson(req)) as never) };
});
