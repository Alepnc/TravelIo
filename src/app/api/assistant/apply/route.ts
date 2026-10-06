import { applyProposalsSchema } from "@/lib/assistant";
import { readJson, requireApiUser, route } from "@/server/http";
import { applyOperations } from "@/server/services/assistant";

export const POST = route(async (req) => {
  const user = await requireApiUser();
  const { operations } = applyProposalsSchema.parse(await readJson(req));
  return applyOperations(user.id, null, operations);
});
