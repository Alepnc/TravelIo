import { z } from "zod";
import { limitOrThrow, readJson, route } from "@/server/http";
import { clientIp } from "@/server/security/request";
import { bookingOptionsForOffer } from "@/server/services/booking";

const body = z.object({ kind: z.enum(["flight", "stay"]), offerId: z.string().min(1).max(200) });

/** Venditori per un'offerta cercata. Pubblico (si esplora senza account) ma limitato per IP: ogni chiamata può costare quota. */
export const POST = route(async (req) => {
  limitOrThrow(`booking:${await clientIp()}`, 40, 60 * 60_000);
  const { kind, offerId } = body.parse(await readJson(req));
  return { options: await bookingOptionsForOffer(kind, offerId) };
});
