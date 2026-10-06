export type AppErrorCode = "not_found" | "forbidden" | "validation" | "conflict" | "unavailable" | "rate_limited";

/** Errore applicativo con messaggio già pensato per l'utente finale. */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Elemento") => new AppError("not_found", `${what} non trovato`);
