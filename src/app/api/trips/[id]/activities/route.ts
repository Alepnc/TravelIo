import { readJson, requireApiUser, route } from "@/server/http";
import { createActivity } from "@/server/services/itinerary";

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  return { itinerary: await createActivity(user.id, id, (await readJson(req)) as never) };
});
