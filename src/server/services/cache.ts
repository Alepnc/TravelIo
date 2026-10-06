import "server-only";

/**
 * Cache TTL in memoria per le risposte dei provider (evita chiamate ripetute e costose).
 * In produzione: sostituire con Redis o con la Data Cache di Next.js mantenendo la firma.
 */
const store = new Map<string, { value: unknown; expires: number }>();
const MAX_ENTRIES = 500;

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await fn();
  if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value!);
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}
