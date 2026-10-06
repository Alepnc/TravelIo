import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Database temporaneo: cache e quota sono persistenti, quindi i test non devono toccare quello di sviluppo
const dbFile = path.join(os.tmpdir(), `travelio-test-${process.pid}.db`);
process.env.DATABASE_URL = `file:${dbFile}`;

type Mods = {
  SerpApiClient: typeof import("./client").SerpApiClient;
  db: typeof import("@/server/db").db;
  schema: typeof import("@/server/db").schema;
  usageThisMonth: typeof import("./usage").usageThisMonth;
  cacheSet: typeof import("@/server/cache/db-cache").cacheSet;
};
let m: Mods;

beforeAll(async () => {
  fs.rmSync(dbFile, { force: true });
  const [client, dbm, usage, cache] = await Promise.all([import("./client"), import("@/server/db"), import("./usage"), import("@/server/cache/db-cache")]);
  m = { SerpApiClient: client.SerpApiClient, db: dbm.db, schema: dbm.schema, usageThisMonth: usage.usageThisMonth, cacheSet: cache.cacheSet };
});

beforeEach(() => {
  m.db.delete(m.schema.providerCache).run();
  m.db.delete(m.schema.providerUsage).run();
  delete process.env.SERPAPI_MONTHLY_LIMIT;
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const call = (key: string, extra: Record<string, unknown> = {}) => ({ params: { engine: "google_flights", q: key }, cacheKey: key, ttlMs: 60_000, klass: "interactive" as const, ...extra });

describe("SerpApiClient", () => {
  it("senza chiave dà un errore chiaro e non spende quota", async () => {
    const fetchImpl = vi.fn();
    const c = new m.SerpApiClient({ apiKey: "", fetchImpl: fetchImpl as never });
    await expect(c.search(call("k1"))).rejects.toThrow(/SERPAPI_API_KEY/);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(m.usageThisMonth().used).toBe(0);
  });

  it("mette in cache: la stessa ricerca costa una sola volta, anche dopo un riavvio", async () => {
    const fetchImpl = vi.fn(async () => json({ best_flights: [] }));
    const c1 = new m.SerpApiClient({ apiKey: "k", fetchImpl: fetchImpl as never });
    await c1.search(call("k2"));
    await c1.search(call("k2"));
    const c2 = new m.SerpApiClient({ apiKey: "k", fetchImpl: fetchImpl as never }); // "nuovo processo"
    await c2.search(call("k2"));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(m.usageThisMonth().used).toBe(1);
  });

  it("unisce le richieste identiche in corso", async () => {
    const fetchImpl = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return json({ best_flights: [] });
    });
    const c = new m.SerpApiClient({ apiKey: "k", fetchImpl: fetchImpl as never });
    await Promise.all([c.search(call("k3")), c.search(call("k3")), c.search(call("k3"))]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(m.usageThisMonth().used).toBe(1);
  });

  it("cacheOnly non spende quota e restituisce null se la risposta manca", async () => {
    const fetchImpl = vi.fn();
    const c = new m.SerpApiClient({ apiKey: "k", fetchImpl: fetchImpl as never });
    expect(await c.search(call("k4", { cacheOnly: true }))).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
    m.cacheSet("k4", { best_flights: [] }, 60_000);
    expect(await c.search(call("k4", { cacheOnly: true }))).not.toBeNull();
  });

  it("rispetta il tetto mensile e riserva quota alle ricerche dirette", async () => {
    process.env.SERPAPI_MONTHLY_LIMIT = "10";
    const fetchImpl = vi.fn(async () => json({ best_flights: [] }));
    const c = new m.SerpApiClient({ apiKey: "k", fetchImpl: fetchImpl as never });
    for (let i = 0; i < 7; i++) await c.search(call(`ind-${i}`, { klass: "indicative" }));
    // 70% del limite (7) raggiunto: le indicative si fermano
    await expect(c.search(call("ind-8", { klass: "indicative" }))).rejects.toThrow(/in pausa/);
    // le dirette proseguono fino al limite
    for (let i = 0; i < 3; i++) await c.search(call(`dir-${i}`));
    await expect(c.search(call("dir-9"))).rejects.toThrow(/limite mensile/);
    expect(fetchImpl).toHaveBeenCalledTimes(10);
  });

  it("traduce gli errori HTTP senza mostrare la chiave", async () => {
    const make = (status: number) => new m.SerpApiClient({ apiKey: "SEGRETA123", fetchImpl: (async () => json({ error: "x SEGRETA123 y" }, status)) as never });
    await expect(make(401).search(call("e1"))).rejects.toThrow(/non valida/);
    await expect(make(429).search(call("e2"))).rejects.toThrow(/sovraccarico|quota/);
    await expect(make(503).search(call("e3"))).rejects.toThrow(/temporaneo/);
    const err = await make(200).search(call("e4")).catch((e) => e);
    expect(String(err.message)).not.toContain("SEGRETA123");
  });

  it("l'errore del provider non finisce in cache; 'nessun risultato' sì", async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => (n++ === 0 ? json({ error: "Qualcosa è andato storto" }) : json({ error: "Google Flights hasn't returned any results for this query." })));
    const c = new m.SerpApiClient({ apiKey: "k", fetchImpl: fetchImpl as never });
    await expect(c.search(call("n1"))).rejects.toThrow();
    const empty = await c.search(call("n1"));
    expect(empty?.json.error).toMatch(/any results/);
    await c.search(call("n1")); // dalla cache
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("converte timeout e rete assente in errori leggibili", async () => {
    const timeout = new m.SerpApiClient({ apiKey: "k", fetchImpl: (async () => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); }) as never });
    await expect(timeout.search(call("t1"))).rejects.toThrow(/troppo/);
    const down = new m.SerpApiClient({ apiKey: "k", fetchImpl: (async () => { throw new TypeError("fetch failed"); }) as never });
    await expect(down.search(call("t2"))).rejects.toThrow(/non è raggiungibile/);
  });
});
