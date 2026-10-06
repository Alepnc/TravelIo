import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { fieldErrors } from "@/lib/validation";
import { getCurrentUser, type SessionUser } from "@/server/auth/session";
import { ProviderError } from "@/server/providers/errors";
import { AppError } from "@/server/services/errors";
import { rateLimit } from "@/server/security/rate-limit";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const STATUS: Record<string, number> = {
  not_found: 404, forbidden: 403, validation: 422, conflict: 409, unavailable: 503, rate_limited: 429, invalid_input: 422, timeout: 504,
};

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Dati non validi", fields: fieldErrors(error) }, { status: 422 });
  if (error instanceof AppError || error instanceof ProviderError) return NextResponse.json({ error: error.message, code: error.code }, { status: STATUS[error.code] ?? 400 });
  console.error(error);
  return NextResponse.json({ error: "Errore interno. Riprova tra poco." }, { status: 500 });
}

/**
 * Protezione CSRF per le mutazioni JSON: il cookie è SameSite=Lax, e in più richiediamo
 * che Origin coincida con l'host (le richieste cross-site da form non arrivano mai qui).
 */
function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return; // client non-browser (curl, test): nessun cookie cross-site in gioco
  if (new URL(origin).host !== req.headers.get("host")) throw new HttpError(403, "Origine non consentita");
}

type Ctx<P> = { params: Promise<P> };

export function route<P = Record<string, never>>(handler: (req: NextRequest, params: P) => Promise<unknown>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      assertSameOrigin(req);
      const data = await handler(req, await ctx.params);
      return data instanceof Response ? data : NextResponse.json(data ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Accedi per continuare");
  return user;
}

export function limitOrThrow(key: string, max: number, windowMs: number) {
  const r = rateLimit(key, max, windowMs);
  if (!r.ok) throw new HttpError(429, `Troppe richieste, riprova tra ${r.retryAfterSec} secondi`);
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Corpo della richiesta non valido");
  }
}

export function queryObject(req: NextRequest): Record<string, string> {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}
