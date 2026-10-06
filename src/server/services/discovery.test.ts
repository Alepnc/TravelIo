import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Destination } from "@/lib/types";
import { DESTINATIONS } from "@/server/mock-data/destinations";

// Provider a pagamento finto: tiene una cache in memoria e conta le ricerche "vere"
const state = vi.hoisted(() => ({ cache: new Map<string, number>(), live: 0, failAfter: Infinity }));

vi.mock("@/server/providers", async () => {
  const { ProviderError } = await import("@/server/providers/errors");
  return {
    destinations: {},
    flights: {
      async quoteRoundTrip(q: { to: string }, opts: { cacheOnly: boolean }) {
        const hit = state.cache.get(q.to);
        if (hit != null) return { status: "hit", price: hit, fetchedAt: "2027-01-01T00:00:00Z" };
        if (opts.cacheOnly) return { status: "miss" };
        if (state.live >= state.failAfter) throw new ProviderError("unavailable", "Quota esaurita");
        state.live++;
        const price = 100 + state.live;
        state.cache.set(q.to, price);
        return { status: "hit", price, fetchedAt: "2027-01-01T00:00:00Z" };
      },
    },
  };
});

const { quoteDestinations, sortQuotes, prioritizeDestinations } = await import("./discovery");

const six: Destination[] = DESTINATIONS.slice(0, 6);
const opts = { from: "NAP", depart: "2027-05-13", ret: "2027-05-17" };

beforeEach(() => {
  state.cache.clear();
  state.live = 0;
  state.failAfter = Infinity;
});

describe("quoteDestinations", () => {
  it("garantisce N prezzi noti rilevando solo i mancanti", async () => {
    const first = await quoteDestinations(six, { ...opts, ensureKnown: 3 });
    expect(first.fetched).toBe(3);
    expect(first.quotes.filter((q) => q.flightStatus === "live")).toHaveLength(3);
    expect(first.quotes.filter((q) => q.flightStatus === "pending")).toHaveLength(3);
  });

  it("ricaricare la pagina non spende altra quota", async () => {
    await quoteDestinations(six, { ...opts, ensureKnown: 3 });
    const again = await quoteDestinations(six, { ...opts, ensureKnown: 3 });
    expect(again.fetched).toBe(0);
    expect(state.live).toBe(3);
  });

  it("alzare l'obiettivo rileva solo la differenza", async () => {
    await quoteDestinations(six, { ...opts, ensureKnown: 3 });
    const more = await quoteDestinations(six, { ...opts, ensureKnown: 5 });
    expect(more.fetched).toBe(2);
    expect(state.live).toBe(5);
  });

  it("con ensureKnown 0 (home, crawler) legge solo la cache", async () => {
    const r = await quoteDestinations(six, { ...opts, ensureKnown: 0 });
    expect(r.fetched).toBe(0);
    expect(state.live).toBe(0);
    state.cache.set(six[0].airportCode, 99);
    const hit = await quoteDestinations(six, { ...opts, ensureKnown: 0 });
    expect(hit.quotes[0].flightPrice).toBe(99);
  });

  it("si ferma al primo errore del provider e lo riporta una volta sola", async () => {
    state.failAfter = 1;
    const r = await quoteDestinations(six, { ...opts, ensureKnown: 6 });
    expect(r.error).toBe("Quota esaurita");
    expect(state.live).toBeLessThanOrEqual(3); // un solo gruppo parallelo parte prima dell'errore
  });

  it("alloggio e spese sono stime etichettabili; il totale esiste solo con il volo reale", async () => {
    const r = await quoteDestinations(six, { ...opts, budget: 10_000, ensureKnown: 1 });
    const live = r.quotes.find((q) => q.flightStatus === "live")!;
    expect(live.totalEstimate).toBe(live.flightPrice! + live.stayEstimate + live.dailyEstimate);
    expect(live.withinBudget).toBe(true);
    const pending = r.quotes.find((q) => q.flightStatus === "pending")!;
    expect(pending.totalEstimate).toBeNull();
    expect(pending.flightPrice).toBeNull();
  });

  it("ordina: prezzo noto prima, nel budget prima di fuori budget, poi i non rilevati", async () => {
    const r = await quoteDestinations(six, { ...opts, budget: 300, ensureKnown: 4 });
    const order = sortQuotes(r.quotes).map((q) => q.flightStatus + ":" + q.withinBudget);
    const firstPending = order.findIndex((x) => x.startsWith("pending"));
    expect(order.slice(0, firstPending).every((x) => x.startsWith("live"))).toBe(true);
  });
});

describe("prioritizeDestinations", () => {
  it("mette prima le mete di stagione e più economiche", () => {
    const august = prioritizeDestinations(DESTINATIONS, 8);
    expect(august[0].bestMonths).toContain(8);
    const inSeason = august.filter((d) => d.bestMonths.includes(8));
    expect(august.slice(0, inSeason.length)).toEqual(inSeason);
  });
});
