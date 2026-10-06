import { limitOrThrow, requireApiUser, route } from "@/server/http";
import { getSuggestions } from "@/server/services/optimizer";

/** ?scope=free (default, locale e gratuito) | ?scope=all (confronta anche voli, date e alloggi: ricerche a pagamento) */
export const GET = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  const scope = req.nextUrl.searchParams.get("scope") === "all" ? "all" : "free";
  if (scope === "all") limitOrThrow(`optimizer:${user.id}`, 10, 60 * 60_000);
  return { scope, suggestions: await getSuggestions(user.id, id, scope) };
});
