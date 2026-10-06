import { readJson, requireApiUser, route } from "@/server/http";
import { deleteActivity, updateActivity } from "@/server/services/itinerary";

export const PATCH = route<{ id: string; activityId: string }>(async (req, { id, activityId }) => {
  const user = await requireApiUser();
  return { itinerary: await updateActivity(user.id, id, activityId, (await readJson(req)) as never) };
});

export const DELETE = route<{ id: string; activityId: string }>(async (_req, { id, activityId }) => {
  const user = await requireApiUser();
  return { itinerary: await deleteActivity(user.id, id, activityId) };
});
