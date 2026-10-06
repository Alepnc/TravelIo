import { searchQuerySchema } from "@/lib/validation";
import { HttpError, limitOrThrow, queryObject, route } from "@/server/http";
import { clientIp, isLikelyBot } from "@/server/security/request";
import { suggestDestinations } from "@/server/services/discovery";

export const GET = route(async (req) => {
  limitOrThrow(`api-suggest:${await clientIp()}`, 10, 10 * 60_000);
  const q = searchQuerySchema.parse(queryObject(req));
  if (!q.from) throw new HttpError(422, "Indica l'aeroporto di partenza");
  const batch = await suggestDestinations({ from: q.from, month: q.month, depart: q.depart, ret: q.ret, travelers: q.travelers, budget: q.budget, ensureKnown: (await isLikelyBot()) ? 0 : 6 });
  return batch;
});
