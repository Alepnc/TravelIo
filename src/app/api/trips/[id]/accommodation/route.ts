import { z } from "zod";
import { readJson, requireApiUser, route } from "@/server/http";
import { removeAccommodation, setAccommodation } from "@/server/services/trips";

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  const { offerId } = z.object({ offerId: z.string().min(1).max(200) }).parse(await readJson(req));
  await setAccommodation(user.id, id, offerId);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireApiUser();
  removeAccommodation(user.id, id);
  return { ok: true };
});
