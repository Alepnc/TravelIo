import { applyProposalsSchema } from "@/lib/assistant";
import { readJson, requireApiUser, route } from "@/server/http";
import { applyOperations } from "@/server/services/assistant";
import { loadItinerary } from "@/server/services/itinerary";

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  const { operations } = applyProposalsSchema.parse(await readJson(req));
  const result = await applyOperations(user.id, id, operations);
  return { ...result, itinerary: await loadItinerary(id) };
});
