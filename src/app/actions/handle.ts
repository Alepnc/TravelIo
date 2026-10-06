import "server-only";
import { ZodError } from "zod";
import { fieldErrors } from "@/lib/validation";
import { AppError } from "@/server/services/errors";
import type { FormState } from "./state";

/** Converte errori noti in stato del form; rilancia il resto (redirect compresi). */
export function toFormState(error: unknown): FormState {
  if (error instanceof ZodError) return { errors: fieldErrors(error) };
  if (error instanceof AppError) return { message: error.message };
  throw error;
}
