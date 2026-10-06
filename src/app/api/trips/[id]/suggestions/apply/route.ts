import { readJson, requireApiUser, route } from "@/server/http";
import { loadItinerary } from "@/server/services/itinerary";
import { applySuggestion } from "@/server/services/optimizer";

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  await applySuggestion(user.id, id, await readJson(req));
  return { ok: true, itinerary: await loadItinerary(id) };
});
