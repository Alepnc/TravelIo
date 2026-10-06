import { z } from "zod";
import { readJson, requireApiUser, route } from "@/server/http";
import { removeFlight, setFlight } from "@/server/services/trips";

const body = z.object({ offerId: z.string().min(1).max(200), direction: z.enum(["andata", "ritorno"]) });

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  const { offerId, direction } = body.parse(await readJson(req));
  await setFlight(user.id, id, offerId, direction);
  return { ok: true };
});

export const DELETE = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  const flightId = z.string().min(1).parse(req.nextUrl.searchParams.get("flightId"));
  removeFlight(user.id, id, flightId);
  return { ok: true };
});
