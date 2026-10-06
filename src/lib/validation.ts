/**
 * Schemi zod condivisi: stessi vincoli per form (client), server action, API e output dell'AI.
 */
import { z } from "zod";

// Messaggi di errore predefiniti in italiano (quelli personalizzati sotto hanno la precedenza)
z.config(z.locales.it());

const isoDate = z.iso.date({ error: "Data non valida" });
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Orario non valido (HH:mm)");
const iata = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Codice aeroporto non valido");

export const tripPaceSchema = z.enum(["rilassato", "bilanciato", "intenso"]);
export const tripStatusSchema = z.enum(["pianificazione", "confermato", "in_corso", "completato"]);
export const activityCategorySchema = z.enum([
  "attrazione", "museo", "ristorante", "natura", "nightlife", "shopping", "trasporto", "alloggio", "volo", "esperienza", "altro",
]);
export const expenseCategorySchema = z.enum(["voli", "alloggio", "trasporti", "attivita", "cibo", "altro"]);

// ───────── Auth ─────────

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Inserisci il tuo nome").max(60),
  email: z.email("Email non valida").trim().toLowerCase().max(120),
  password: z.string().min(8, "Almeno 8 caratteri").max(200),
});

export const loginSchema = z.object({
  email: z.email("Email non valida").trim().toLowerCase(),
  password: z.string().min(1, "Inserisci la password").max(200),
});

export const forgotSchema = z.object({ email: z.email("Email non valida").trim().toLowerCase() });

export const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, "Almeno 8 caratteri").max(200),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  homeAirport: iata.optional().or(z.literal("")),
  pace: tripPaceSchema,
  budgetLevel: z.enum(["basso", "medio", "alto"]),
  interests: z.array(z.string().max(30)).max(12),
});

// ───────── Ricerca ─────────

export const searchQuerySchema = z
  .object({
    from: iata.optional(),
    to: z.string().trim().max(60).optional(),
    depart: isoDate.optional(),
    ret: isoDate.optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    travelers: z.coerce.number().int().min(1).max(12).default(2),
    budget: z.coerce.number().int().min(50).max(20000).optional(),
  })
  .refine((q) => !q.depart || !q.ret || q.ret > q.depart, { message: "Il ritorno deve essere dopo la partenza", path: ["ret"] });

export const flightQuerySchema = z.object({
  from: iata,
  to: iata,
  date: isoDate,
  travelers: z.coerce.number().int().min(1).max(12).default(1),
});

export const accommodationQuerySchema = z.object({
  destination: z.string().min(1).max(60),
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.coerce.number().int().min(1).max(12).default(2),
});

// ───────── Viaggi ─────────

export const tripInputSchema = z
  .object({
    name: z.string().trim().min(2, "Dai un nome al viaggio").max(80),
    destinationId: z.string().min(1, "Scegli una destinazione").max(60),
    originCode: iata.optional().or(z.literal("").transform(() => undefined)),
    startDate: isoDate,
    endDate: isoDate,
    travelersCount: z.coerce.number().int().min(1, "Almeno 1 viaggiatore").max(12),
    budgetPerPerson: z.coerce.number().int().min(0).max(20000).optional(),
    pace: tripPaceSchema.default("bilanciato"),
    travelerNames: z.array(z.string().trim().max(60)).max(12).default([]),
  })
  .refine((t) => t.endDate >= t.startDate, { message: "Il ritorno deve essere dopo la partenza", path: ["endDate"] })
  .refine((t) => (Date.parse(t.endDate) - Date.parse(t.startDate)) / 86_400_000 <= 30, {
    message: "Al massimo 30 giorni per viaggio",
    path: ["endDate"],
  });

export const draftSelectionSchema = z.object({
  outboundOfferId: z.string().max(200).optional(),
  returnOfferId: z.string().max(200).optional(),
  accommodationOfferId: z.string().max(200).optional(),
});

// ───────── Itinerario ─────────

export const activityInputSchema = z.object({
  dayId: z.string().min(1),
  title: z.string().trim().min(1, "Dai un titolo").max(120),
  category: activityCategorySchema,
  startTime: hhmm,
  durationMin: z.coerce.number().int().min(5).max(16 * 60),
  placeName: z.string().trim().max(120).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  cost: z.coerce.number().min(0).max(5000).default(0),
  notes: z.string().trim().max(1000).nullable().optional(),
  poiId: z.string().max(80).nullable().optional(),
  timeLocked: z.boolean().optional(),
});

export const activityPatchSchema = activityInputSchema.partial().extend({ dayId: z.string().min(1).optional() });

export const reorderSchema = z.object({
  days: z
    .array(z.object({ dayId: z.string().min(1), activityIds: z.array(z.string().min(1)).max(60) }))
    .min(1)
    .max(31),
});

export const expenseInputSchema = z.object({
  category: expenseCategorySchema,
  label: z.string().trim().min(1, "Descrivi la spesa").max(80),
  amount: z.coerce.number().positive("Importo non valido").max(100000),
  spentAt: isoDate.optional(),
});

export const assistantMessageSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(20)
    .default([]),
  focusDayId: z.string().optional(),
});

/** Primo messaggio d'errore per campo, adatto ai form */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
