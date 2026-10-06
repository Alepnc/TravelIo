import "server-only";
/**
 * Assistente basato su Claude. Il modello riceve il contesto del viaggio e risponde con
 * testo + chiamate a tool "propose_*": ogni tool è un'OPERAZIONE PROPOSTA, mai eseguita qui.
 * Gli input vengono validati con zod e gli id verificati contro il contesto prima di arrivare all'utente.
 */
import Anthropic from "@anthropic-ai/sdk";
import { assistantOperationSchema, type AssistantOperation, type AssistantReply } from "@/lib/assistant";
import { AppError } from "../errors";
import { serializeContext, toProposals, type AssistantContext } from "./context";

const MODEL = process.env.ASSISTANT_MODEL || "claude-opus-5-5";

const SYSTEM = `Sei l'assistente di viaggio di TravelIo, un'app per organizzare viaggi spendendo poco, pensata per giovani, studenti e gruppi di amici.
Rispondi sempre in italiano, in modo amichevole e conciso (massimo 3-4 frasi).

Ricevi in ogni messaggio il contesto del viaggio corrente tra i tag <contesto_viaggio>. Usalo per proporre modifiche concrete:
- Per modificare il viaggio usa SOLO i tool propose_*. Le proposte vengono mostrate all'utente, che decide se applicarle: non dire che hai già fatto la modifica, di' che la proponi.
- Usa esclusivamente id di attività (campo "id") e di POI (campo "id" in poi_disponibili) presenti nel contesto. Non inventare luoghi: se un luogo non è tra i POI disponibili, puoi proporlo con add_activity indicando title, category, durationMin e cost, con poiId null.
- "Questa attività" o "questo giorno" si riferiscono al giorno in focus (giorno_in_focus, indice da 0).
- I giorni nei tool sono indici da 0; quando ne parli all'utente numera da 1.
- Rispetta realismo: orari di apertura, durata, distanze. Non proporre più di 5 operazioni per risposta.
- Per richieste di budget confronta i costi (per persona) e preferisci attività gratuite o economiche vicine.
- Se manca un itinerario, suggerisci di generarlo prima. Se non c'è un viaggio e l'utente chiede di organizzarne uno, usa propose_create_trip con una destinazione tra quelle disponibili.
- Per domande generiche di viaggio (cosa mettere in valigia, come muoversi) rispondi normalmente senza tool.`;

const nullable = (type: string) => ({ type: [type, "null"] });

function tool(name: string, description: string, properties: Record<string, unknown>): Anthropic.Beta.BetaTool {
  return {
    name,
    description,
    strict: true,
    input_schema: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
  };
}

const CATEGORIES = ["attrazione", "museo", "ristorante", "natura", "nightlife", "shopping", "trasporto", "alloggio", "esperienza", "altro"];

const TOOLS: Anthropic.Beta.BetaTool[] = [
  tool("propose_add_activity", "Propone di aggiungere un'attività a una giornata dell'itinerario.", {
    dayIndex: { type: "integer", description: "Indice del giorno (da 0)" },
    poiId: { ...nullable("string"), description: "Id di un POI disponibile, oppure null per un'attività libera" },
    title: { ...nullable("string"), description: "Titolo, obbligatorio se poiId è null" },
    category: { type: ["string", "null"], enum: [...CATEGORIES, null] },
    startTime: { ...nullable("string"), description: "Orario HH:mm" },
    durationMin: nullable("integer"),
    cost: { ...nullable("number"), description: "Costo per persona in euro" },
  }),
  tool("propose_remove_activity", "Propone di rimuovere un'attività dall'itinerario.", { activityId: { type: "string" } }),
  tool("propose_replace_activity", "Propone di sostituire un'attività con un POI disponibile (es. più economico o più vicino).", {
    activityId: { type: "string" },
    poiId: { type: "string" },
  }),
  tool("propose_move_activity", "Propone di spostare un'attività in un altro giorno.", {
    activityId: { type: "string" },
    toDayIndex: { type: "integer" },
  }),
  tool("propose_update_activity", "Propone di cambiare orario, durata o note di un'attività.", {
    activityId: { type: "string" },
    startTime: nullable("string"),
    durationMin: nullable("integer"),
    notes: nullable("string"),
  }),
  tool("propose_regenerate_day", "Propone di riorganizzare un'intera giornata con un ritmo diverso (le modifiche manuali restano).", {
    dayIndex: { type: "integer" },
    pace: { type: "string", enum: ["rilassato", "bilanciato", "intenso"] },
  }),
  tool("propose_create_trip", "Propone di creare un nuovo viaggio verso una destinazione disponibile.", {
    destinationId: { type: "string" },
    days: { type: "integer" },
    budgetPerPerson: { ...nullable("integer"), description: "Budget per persona in euro" },
    travelers: nullable("integer"),
  }),
];

const TOOL_TO_TYPE: Record<string, AssistantOperation["type"]> = {
  propose_add_activity: "add_activity",
  propose_remove_activity: "remove_activity",
  propose_replace_activity: "replace_activity",
  propose_move_activity: "move_activity",
  propose_update_activity: "update_activity",
  propose_regenerate_day: "regenerate_day",
  propose_create_trip: "create_trip",
};

let client: Anthropic | null = null;

export function claudeAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function claudeReply(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  ctx: AssistantContext,
): Promise<AssistantReply> {
  client ??= new Anthropic();
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create(
      {
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        tools: TOOLS,
        messages: [
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: "user", content: `<contesto_viaggio>\n${serializeContext(ctx)}\n</contesto_viaggio>\n\n${message}` },
        ],
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) throw new AppError("rate_limited", "L'assistente è molto richiesto, riprova tra qualche secondo.");
    if (error instanceof Anthropic.AuthenticationError) throw new AppError("unavailable", "Assistente AI non configurato correttamente (chiave API non valida).");
    if (error instanceof Anthropic.APIError) throw new AppError("unavailable", "L'assistente non è disponibile in questo momento.");
    throw error;
  }

  if (response.stop_reason === "refusal") {
    return { reply: "Non posso aiutarti con questa richiesta. Proviamo a parlare del tuo viaggio?", proposals: [], engine: "claude" };
  }

  const text: string[] = [];
  const ops: AssistantOperation[] = [];
  for (const block of response.content) {
    if (block.type === "text") text.push(block.text);
    if (block.type === "tool_use") {
      const type = TOOL_TO_TYPE[block.name];
      const parsed = assistantOperationSchema.safeParse({ ...(block.input as object), type });
      if (parsed.success) ops.push(parsed.data);
    }
  }
  const proposals = toProposals(ops, ctx);
  const reply = text.join("\n").trim() || (proposals.length ? "Ecco cosa ti propongo:" : "Non sono riuscito a trovare una modifica adatta. Puoi riformulare?");
  return { reply, proposals, engine: "claude" };
}
