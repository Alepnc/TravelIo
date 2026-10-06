import { limitOrThrow, readJson, requireApiUser, route } from "@/server/http";
import { askAssistant } from "@/server/services/assistant";

/** Assistente senza viaggio corrente (es. "organizzami 5 giorni a Parigi") */
export const POST = route(async (req) => {
  const user = await requireApiUser();
  limitOrThrow(`assistant:${user.id}`, 15, 60_000);
  return askAssistant(user.id, null, (await readJson(req)) as never);
});
