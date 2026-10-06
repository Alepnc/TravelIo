import "server-only";
import { headers } from "next/headers";

/** IP del client per il rate limiting (dietro proxy fidato). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

/**
 * Crawler e anteprime: non devono consumare quota di provider a pagamento.
 * Controllo volutamente grossolano (user agent): serve a evitare lo spreco, non è una misura di sicurezza.
 */
export async function isLikelyBot(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return !ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|curl|wget|python-requests/i.test(ua);
}
