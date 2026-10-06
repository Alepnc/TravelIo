import { describe, expect, it } from "vitest";
import { generateItinerary, type DraftActivity } from "./generate";
import { estimateTravel } from "../geo";
import { toMinutes } from "../time";
import { POIS } from "@/server/mock-data/pois";

const bcnPois = POIS.filter((p) => p.destinationId === "barcellona");
const base = {
  destinationName: "Barcellona",
  center: { lat: 41.3874, lng: 2.1686 },
  startDate: "2027-08-12",
  endDate: "2027-08-16",
  pois: bcnPois,
  pace: "bilanciato" as const,
  mealCost: 20,
  travel: estimateTravel,
  hotel: { name: "Hotel test", location: { lat: 41.3917, lng: 2.1649 } },
  arrival: { at: "2027-08-12T09:30", airportCode: "BCN", airportLocation: { lat: 41.2974, lng: 2.0833 } },
  departure: { at: "2027-08-16T18:00", airportCode: "BCN", airportLocation: { lat: 41.2974, lng: 2.0833 } },
};

function assertNoOverlap(acts: DraftActivity[]) {
  for (let i = 1; i < acts.length; i++) {
    const prevEnd = toMinutes(acts[i - 1].startTime) + acts[i - 1].durationMin;
    expect(toMinutes(acts[i].startTime), `${acts[i - 1].title} → ${acts[i].title}`).toBeGreaterThanOrEqual(prevEnd);
  }
}

describe("generateItinerary", () => {
  const days = generateItinerary(base);

  it("crea una giornata per ogni data del viaggio", () => {
    expect(days.map((d) => d.date)).toEqual(["2027-08-12", "2027-08-13", "2027-08-14", "2027-08-15", "2027-08-16"]);
  });

  it("inizia con l'arrivo del volo e finisce con il volo di ritorno", () => {
    expect(days[0].activities[0]).toMatchObject({ category: "volo", startTime: "09:30", timeLocked: true });
    const last = days.at(-1)!.activities.at(-1)!;
    expect(last).toMatchObject({ category: "volo", startTime: "18:00" });
  });

  it("non sovrappone attività e include tempo di spostamento", () => {
    for (const d of days) assertNoOverlap(d.activities);
  });

  it("non usa lo stesso POI due volte", () => {
    const ids = days.flatMap((d) => d.activities.map((a) => a.poiId).filter(Boolean));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("inserisce pranzo e cena nelle giornate piene", () => {
    for (const d of days.slice(1, -1)) {
      const meals = d.activities.filter((a) => a.category === "ristorante");
      expect(meals.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("rispetta gli orari di apertura", () => {
    for (const d of days)
      for (const a of d.activities) {
        const poi = bcnPois.find((p) => p.id === a.poiId);
        if (!poi) continue;
        expect(toMinutes(a.startTime)).toBeGreaterThanOrEqual(toMinutes(poi.opening.open));
      }
  });

  it("raggruppa le tappe: nessuno spostamento consecutivo oltre i 40 minuti", () => {
    for (const d of days) for (const a of d.activities) if (a.category !== "trasporto" && a.category !== "volo") expect(a.travelMinFromPrev ?? 0).toBeLessThanOrEqual(40);
  });

  it("il ritmo rilassato produce meno tappe di quello intenso", () => {
    const count = (pace: "rilassato" | "intenso") =>
      generateItinerary({ ...base, pace, endDate: "2027-08-14", departure: { ...base.departure, at: "2027-08-14T20:00" } }).flatMap((d) => d.activities).filter((a) => a.poiId && a.category !== "ristorante").length;
    expect(count("rilassato")).toBeLessThan(count("intenso"));
  });

  it("rigenera una sola giornata mantenendo le attività fissate dall'utente", () => {
    const fixed = { ...days[2].activities.find((a) => a.poiId && a.category !== "ristorante")!, timeLocked: true, startTime: "16:00" };
    const usedElsewhere = days.filter((d) => d.dayIndex !== 2).flatMap((d) => d.activities.map((a) => a.poiId!)).filter(Boolean);
    const [day] = generateItinerary({ ...base, dayIndexes: [2], excludePoiIds: usedElsewhere, fixedByDay: { 2: [fixed] } });
    expect(day.dayIndex).toBe(2);
    expect(day.activities.find((a) => a.poiId === fixed.poiId)?.startTime).toBe("16:00");
    for (const a of day.activities) if (a.poiId && a.poiId !== fixed.poiId) expect(usedElsewhere).not.toContain(a.poiId);
    assertNoOverlap(day.activities);
  });
});
