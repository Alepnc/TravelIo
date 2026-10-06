import { z } from "zod";
import { limitOrThrow, readJson, requireApiUser, route } from "@/server/http";
import { bookingOptionsForTripItem } from "@/server/services/booking";

const body = z.object({ kind: z.enum(["flight", "stay"]), itemId: z.string().min(1).max(80) });

/** Venditori per un volo o un alloggio già salvato nel viaggio. */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  limitOrThrow(`booking:${user.id}`, 40, 60 * 60_000);
  const { kind, itemId } = body.parse(await readJson(req));
  return { options: await bookingOptionsForTripItem(user.id, id, kind, itemId) };
});
