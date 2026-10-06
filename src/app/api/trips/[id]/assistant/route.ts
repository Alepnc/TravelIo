import { limitOrThrow, readJson, requireApiUser, route } from "@/server/http";
import { askAssistant } from "@/server/services/assistant";

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  limitOrThrow(`assistant:${user.id}`, 15, 60_000);
  return askAssistant(user.id, id, (await readJson(req)) as never);
});
