import { describe, expect, it } from "vitest";
import { findConflicts, reflowDay } from "./reflow";
import { mapStops } from "./stops";
import { bestActivityMove } from "./optimize";
import type { ItineraryActivity, ItineraryDay } from "../types";

const act = (id: string, start: string, dur: number, lat: number | null, lng: number | null, extra: Partial<ItineraryActivity> = {}): ItineraryActivity => ({
  id, dayId: "d", position: 0, title: id, category: "attrazione", startTime: start, durationMin: dur, placeName: null, lat, lng, cost: 0, notes: null,
  poiId: null, source: "generated", isUserModified: false, timeLocked: false, travelMinFromPrev: null, ...extra,
});

describe("reflowDay", () => {
  it("ricalcola gli orari dopo un riordino includendo lo spostamento", () => {
    const items = [act("b", "11:00", 60, 41.40, 2.17), act("a", "09:00", 90, 41.38, 2.17)];
    const out = reflowDay(items, "09:00");
    expect(out[0].startTime).toBe("09:00");
    expect(out[1].travelMinFromPrev).toBeGreaterThan(0);
    expect(out[1].startTime > "10:00").toBe(true);
  });

  it("non sposta le attività con orario bloccato e segnala i conflitti", () => {
    const items = [act("a", "09:00", 240, null, null), act("volo", "11:00", 30, null, null, { timeLocked: true, category: "volo" })];
    const out = reflowDay(items);
    expect(out[1].startTime).toBe("11:00");
    expect(findConflicts(out).has("volo")).toBe(true);
  });
});

describe("mapStops", () => {
  it("numera le tappe e unisce attività consecutive nello stesso luogo", () => {
    const { stops, numberOf } = mapStops([act("hotel", "10:00", 30, 41.39, 2.16), act("checkin", "10:30", 30, 41.39, 2.16), act("x", "12:00", 60, 41.41, 2.17), act("nocoords", "14:00", 60, null, null)]);
    expect(stops.map((s) => s.number)).toEqual([1, 2]);
    expect(numberOf.get("checkin")).toBe(1);
    expect(numberOf.has("nocoords")).toBe(false);
  });
});

describe("bestActivityMove", () => {
  it("propone di spostare un'attività vicina alle tappe di un altro giorno", () => {
    const day = (id: string, dayIndex: number, activities: ItineraryActivity[]): ItineraryDay => ({ id, dayIndex, date: "2027-05-10", title: "", isUserModified: false, activities });
    // Giorno 1 nel centro, con una tappa isolata a nord-ovest; giorno 2 tutto a nord-ovest
    const d1 = day("d1", 0, [act("c1", "09:00", 60, 41.385, 2.17), act("lontana", "10:30", 60, 41.43, 2.10), act("c2", "12:00", 60, 41.386, 2.171)]);
    const d2 = day("d2", 1, [act("n1", "09:00", 60, 41.428, 2.101), act("n2", "11:00", 60, 41.431, 2.103)]);
    const move = bestActivityMove([d1, d2]);
    expect(move?.activityId).toBe("lontana");
    expect(move?.toDayId).toBe("d2");
    expect(move!.saving).toBeGreaterThan(20);
  });
});
