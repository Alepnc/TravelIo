import { describe, expect, it } from "vitest";
import { ruleBasedReply } from "./rules";
import type { AssistantContext } from "./context";
import { DESTINATIONS } from "@/server/mock-data/destinations";
import { POIS } from "@/server/mock-data/pois";
import type { TripDetail } from "@/lib/dto";

const pois = POIS.filter((p) => p.destinationId === "parigi");
const louvre = pois.find((p) => p.name.includes("Louvre"))!;
const eiffel = pois.find((p) => p.name.includes("Eiffel"))!;

const trip = {
  id: "t", name: "Parigi", destinationId: "parigi", startDate: "2027-05-10", endDate: "2027-05-12", travelersCount: 2, budgetPerPerson: 600,
  flights: [], stay: null, expenses: [], destinationDailyCost: 55, pace: "bilanciato",
  itinerary: {
    id: "i", tripId: "t", pace: "bilanciato", generatedAt: "",
    days: [0, 1, 2].map((i) => ({
      id: `d${i}`, dayIndex: i, date: `2027-05-1${i}`, title: "", isUserModified: false,
      activities: i === 1 ? [{ id: "a-eiffel", dayId: "d1", position: 0, title: eiffel.name, category: eiffel.category, startTime: "10:00", durationMin: 120, placeName: null, lat: eiffel.location.lat, lng: eiffel.location.lng, cost: eiffel.cost, notes: null, poiId: eiffel.id, source: "generated", isUserModified: false, timeLocked: false, travelMinFromPrev: null }] : [],
    })),
  },
} as unknown as TripDetail;

const ctx: AssistantContext = { trip, pois, destinations: DESTINATIONS, focusDayIndex: 1 };

describe("assistente a regole", () => {
  it("organizza un viaggio da zero", () => {
    const r = ruleBasedReply("Organizzami 5 giorni a Parigi spendendo massimo 600 €", { ...ctx, trip: null });
    expect(r.proposals[0].operation).toMatchObject({ type: "create_trip", destinationId: "parigi", days: 5, budgetPerPerson: 600 });
  });

  it("aggiunge una visita a un POI esistente", () => {
    const r = ruleBasedReply("Aggiungi una visita al Louvre", ctx);
    expect(r.proposals[0].operation).toMatchObject({ type: "add_activity", poiId: louvre.id });
  });

  it("rende tranquilla la giornata in focus", () => {
    const r = ruleBasedReply("Vorrei una giornata tranquilla", ctx);
    expect(r.proposals[0].operation).toEqual({ type: "regenerate_day", dayIndex: 1, pace: "rilassato" });
  });

  it("sostituisce un'attività con una più economica", () => {
    const r = ruleBasedReply("Togli la Torre Eiffel e trovami qualcosa di più economico", ctx);
    const op = r.proposals[0].operation;
    expect(op.type).toBe("replace_activity");
    if (op.type === "replace_activity") expect(pois.find((p) => p.id === op.poiId)!.cost).toBeLessThan(eiffel.cost);
  });

  it("non inventa operazioni quando non capisce", () => {
    expect(ruleBasedReply("ciao", ctx).proposals).toHaveLength(0);
  });
});
