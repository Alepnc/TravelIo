import { ProviderError } from "../errors";

/**
 * Simula latenza e guasti dei servizi esterni in sviluppo, così skeleton ed error state
 * sono verificabili. Configurabile con MOCK_LATENCY_MS e MOCK_FAILURE_RATE (0-1).
 */
export async function simulateNetwork(service: string): Promise<void> {
  const latency = Number(process.env.MOCK_LATENCY_MS ?? 250);
  const failureRate = Number(process.env.MOCK_FAILURE_RATE ?? 0);
  if (latency > 0) await new Promise((r) => setTimeout(r, latency * (0.6 + Math.random() * 0.8)));
  if (failureRate > 0 && Math.random() < failureRate) {
    throw new ProviderError("unavailable", `Il servizio ${service} non è al momento disponibile`);
  }
}
