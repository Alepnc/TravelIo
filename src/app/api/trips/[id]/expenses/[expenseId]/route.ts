import { requireApiUser, route } from "@/server/http";
import { deleteExpense } from "@/server/services/trips";

export const DELETE = route<{ id: string; expenseId: string }>(async (_req, { id, expenseId }) => {
  const user = await requireApiUser();
  deleteExpense(user.id, id, expenseId);
  return { ok: true };
});
