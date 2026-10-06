import { readJson, requireApiUser, route } from "@/server/http";
import { addExpense } from "@/server/services/trips";

export const POST = route<{ id: string }>(async (req, { id }) => {
  const user = await requireApiUser();
  return { expense: addExpense(user.id, id, (await readJson(req)) as never) };
});
