import { describe, expect, it } from "vitest";
import { computeBudget } from "./budget";
import type { TripDetail } from "./dto";

const base: Parameters<typeof computeBudget>[0] = {
  flights: [
    { pricePerPerson: 60 } as TripDetail["flights"][number],
    { pricePerPerson: 40 } as TripDetail["flights"][number],
  ],
  stay: { priceTotal: 300 } as TripDetail["stay"],
  itinerary: null,
  expenses: [],
  travelersCount: 2,
  budgetPerPerson: 400,
  startDate: "2027-05-10",
  endDate: "2027-05-13",
  destinationDailyCost: 40,
};

describe("computeBudget", () => {
  it("moltiplica i voli per i viaggiatori e usa il totale dell'alloggio", () => {
    const b = computeBudget(base);
    expect(b.lines.find((l) => l.category === "voli")!.estimated).toBe(200);
    expect(b.lines.find((l) => l.category === "alloggio")!.estimated).toBe(300);
    expect(b.days).toBe(4);
    expect(b.nights).toBe(3);
  });

  it("segnala lo sforamento del budget", () => {
    const b = computeBudget({ ...base, budgetPerPerson: 200 });
    expect(b.plannedTotal).toBe(400);
    expect(b.overBy).toBeGreaterThan(0);
    expect(b.usage!).toBeGreaterThan(1);
  });

  it("usa lo speso quando supera la stima", () => {
    const b = computeBudget({ ...base, expenses: [{ id: "e", category: "voli", label: "Volo", amount: 500, spentAt: null }] });
    expect(b.actualTotal).toBe(500);
    expect(b.estimatedTotal).toBeGreaterThanOrEqual(500 + 300);
  });

  it("senza budget non calcola l'utilizzo", () => {
    const b = computeBudget({ ...base, budgetPerPerson: null });
    expect(b.usage).toBeNull();
    expect(b.overBy).toBe(0);
  });
});
