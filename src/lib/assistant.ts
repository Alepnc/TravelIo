/**
 * Operazioni che l'assistente può PROPORRE sul viaggio. L'assistente non scrive mai direttamente:
 * le proposte vengono mostrate all'utente e applicate solo se accettate.
 */
import { z } from "zod";
import { activityCategorySchema, tripPaceSchema } from "./validation";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const assistantOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add_activity"),
    dayIndex: z.number().int().min(0).max(30),
    poiId: z.string().max(80).nullable(),
    title: z.string().max(120).nullable(),
    category: activityCategorySchema.nullable(),
    startTime: hhmm.nullable(),
    durationMin: z.number().int().min(10).max(600).nullable(),
    cost: z.number().min(0).max(2000).nullable(),
  }),
  z.object({ type: z.literal("remove_activity"), activityId: z.string().max(80) }),
  z.object({ type: z.literal("replace_activity"), activityId: z.string().max(80), poiId: z.string().max(80) }),
  z.object({ type: z.literal("move_activity"), activityId: z.string().max(80), toDayIndex: z.number().int().min(0).max(30) }),
  z.object({
    type: z.literal("update_activity"),
    activityId: z.string().max(80),
    startTime: hhmm.nullable(),
    durationMin: z.number().int().min(10).max(600).nullable(),
    notes: z.string().max(500).nullable(),
  }),
  z.object({ type: z.literal("regenerate_day"), dayIndex: z.number().int().min(0).max(30), pace: tripPaceSchema }),
  z.object({
    type: z.literal("create_trip"),
    destinationId: z.string().max(60),
    days: z.number().int().min(1).max(30),
    budgetPerPerson: z.number().int().min(0).max(20000).nullable(),
    travelers: z.number().int().min(1).max(12).nullable(),
  }),
]);

export type AssistantOperation = z.infer<typeof assistantOperationSchema>;

export interface AssistantProposal {
  id: string;
  /** Descrizione leggibile, es. "Aggiungi Museo del Louvre al giorno 2 alle 10:00" */
  label: string;
  operation: AssistantOperation;
}

export interface AssistantReply {
  reply: string;
  proposals: AssistantProposal[];
  /** "claude" o "regole" (modalità demo senza API key) */
  engine: "claude" | "regole";
}

export const applyProposalsSchema = z.object({ operations: z.array(assistantOperationSchema).min(1).max(10) });
