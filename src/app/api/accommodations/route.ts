import { accommodationQuerySchema } from "@/lib/validation";
import { limitOrThrow, queryObject, route } from "@/server/http";
import { clientIp } from "@/server/security/request";
import { searchAccommodations } from "@/server/services/search";

export const GET = route(async (req) => {
  // Endpoint pubblico che può consumare quota del provider: limite per IP
  limitOrThrow(`api-stays:${await clientIp()}`, 20, 10 * 60_000);
  const q = accommodationQuerySchema.parse(queryObject(req));
  return { offers: await searchAccommodations(q.destination, q.checkIn, q.checkOut, q.guests) };
});
