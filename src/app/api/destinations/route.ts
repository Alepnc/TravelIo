import { z } from "zod";
import { queryObject, route } from "@/server/http";
import { listDestinations } from "@/server/services/discovery";

const schema = z.object({
  category: z.enum(["mare", "nightlife", "natura", "cultura", "avventura", "citta", "weekend", "economici"]).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  q: z.string().max(60).optional(),
});

export const GET = route(async (req) => ({ destinations: await listDestinations(schema.parse(queryObject(req))) }));
