import { flightQuerySchema } from "@/lib/validation";
import { limitOrThrow, queryObject, route } from "@/server/http";
import { clientIp } from "@/server/security/request";
import { searchFlights } from "@/server/services/search";

export const GET = route(async (req) => {
  // Endpoint pubblico che può consumare quota del provider: limite per IP
  limitOrThrow(`api-flights:${await clientIp()}`, 20, 10 * 60_000);
  const q = flightQuerySchema.parse(queryObject(req));
  return { offers: await searchFlights(q.from, q.to, q.date, q.travelers) };
});
