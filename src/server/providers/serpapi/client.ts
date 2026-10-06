import "server-only";
import { cacheGet, cacheSet } from "@/server/cache/db-cache";
import { ProviderError } from "../errors";
import { reserveSearch, type UsageClass } from "./usage";

const NO_RESULTS = /hasn'?t returned any results|no results|nessun risultato/i;

export interface SerpApiOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface SerpCall {
  /** Parametri della query (senza api_key) */
  params: Record<string, string | number | boolean | undefined>;
  /** Chiave di cache: deve identificare in modo univoco la query */
  cacheKey: string;
  ttlMs: number;
  klass: UsageClass;
  /** Solo cache: non spendere quota */
  cacheOnly?: boolean;
}

export type SerpResponse = Record<string, unknown> & { error?: string };

/**
 * Client minimale per SerpApi: cache persistente, deduplica delle richieste identiche in corso,
 * contatore di quota e traduzione degli errori in messaggi per l'utente.
 * La chiave API resta lato server e non finisce mai in log o messaggi d'errore.
 */
export class SerpApiClient {
  private inflight = new Map<string, Promise<{ json: SerpResponse; fetchedAt: string }>>();

  constructor(private opts: SerpApiOptions = {}) {}

  private get apiKey() {
    return this.opts.apiKey ?? process.env.SERPAPI_API_KEY;
  }

  private get baseUrl() {
    return (this.opts.baseUrl ?? process.env.SERPAPI_BASE_URL ?? "https://serpapi.com").replace(/\/$/, "");
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /** Risposta già in cache, senza spendere quota. */
  async peek(cacheKey: string): Promise<{ json: SerpResponse; fetchedAt: string } | null> {
    const hit = await cacheGet<SerpResponse>(cacheKey);
    return hit ? { json: hit.value, fetchedAt: hit.createdAt } : null;
  }

  async search(call: SerpCall): Promise<{ json: SerpResponse; fetchedAt: string } | null> {
    const hit = await this.peek(call.cacheKey);
    if (hit) return hit;
    if (call.cacheOnly) return null;

    const running = this.inflight.get(call.cacheKey);
    if (running) return running;

    const promise = this.fetchLive(call).finally(() => this.inflight.delete(call.cacheKey));
    this.inflight.set(call.cacheKey, promise);
    return promise;
  }

  private async fetchLive(call: SerpCall): Promise<{ json: SerpResponse; fetchedAt: string }> {
    if (!this.apiKey) {
      throw new ProviderError(
        "unavailable",
        process.env.NODE_ENV === "production"
          ? "Il servizio prezzi non è configurato."
          : "Prezzi reali non disponibili: manca SERPAPI_API_KEY (vedi README, sezione \"Dati reali\").",
      );
    }
    await reserveSearch(call.klass);

    const url = new URL(`${this.baseUrl}/search.json`);
    for (const [k, v] of Object.entries(call.params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    url.searchParams.set("api_key", this.apiKey);

    let res: Response;
    try {
      res = await (this.opts.fetchImpl ?? fetch)(url, { signal: AbortSignal.timeout(this.opts.timeoutMs ?? 25_000), headers: { Accept: "application/json" } });
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      throw new ProviderError(timedOut ? "timeout" : "unavailable", timedOut ? "Il servizio prezzi ha impiegato troppo a rispondere. Riprova." : "Il servizio prezzi non è raggiungibile.");
    }

    if (res.status === 401 || res.status === 403) throw new ProviderError("unavailable", "Chiave SerpApi non valida o non autorizzata.");
    if (res.status === 429) throw new ProviderError("unavailable", "Il servizio prezzi è sovraccarico o la quota SerpApi è esaurita. Riprova più tardi.");
    if (res.status >= 500) throw new ProviderError("unavailable", "Il servizio prezzi ha un problema temporaneo. Riprova tra poco.");

    let json: SerpResponse;
    try {
      json = (await res.json()) as SerpResponse;
    } catch {
      throw new ProviderError("unavailable", "Risposta non leggibile dal servizio prezzi.");
    }

    if (typeof json.error === "string" && !NO_RESULTS.test(json.error)) {
      // Il testo dell'errore viene dal provider: lo registriamo ma non lo mostriamo all'utente
      console.error(`[serpapi] ${call.params.engine}: ${json.error}`);
      throw new ProviderError("unavailable", "Il servizio prezzi non ha potuto completare la ricerca.");
    }
    if (!res.ok) throw new ProviderError("unavailable", "Il servizio prezzi ha risposto con un errore.");

    // "Nessun risultato" è una risposta valida: la mettiamo in cache per non pagare di nuovo la stessa ricerca vuota
    await cacheSet(call.cacheKey, json, call.ttlMs);
    return { json, fetchedAt: new Date().toISOString() };
  }
}

export function isEmptyResult(json: SerpResponse): boolean {
  return typeof json.error === "string" && NO_RESULTS.test(json.error);
}

/** Ore → ms da variabile d'ambiente, con default. */
export function ttlFromEnv(name: string, defaultMinutes: number): number {
  const n = Number(process.env[name]);
  return (Number.isFinite(n) && n > 0 ? n : defaultMinutes) * 60_000;
}
