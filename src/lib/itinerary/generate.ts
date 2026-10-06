/**
 * Generatore di itinerari — funzione pura e deterministica.
 *
 * Strategia:
 *  1. Costruisce la "cornice" di ogni giornata: finestra utile considerando voli, transfer,
 *     check-in/check-out e ritmo scelto.
 *  2. Seleziona i POI per punteggio (popolarità, interessi, budget).
 *  3. Raggruppa i POI per vicinanza geografica, riempiendo prima le giornate più lunghe
 *     (una giornata = una zona della città → pochi spostamenti).
 *  4. Pianifica ogni giornata in modo greedy: sceglie la prossima tappa minimizzando
 *     spostamento + attesa apertura + penalità di fascia oraria, inserisce pranzo e cena
 *     vicino alla posizione corrente e rispetta i blocchi fissati dall'utente.
 */
import type { ActivityCategory, LatLng, PointOfInterest, TripPace } from "../types";
import type { TravelMode } from "../geo";
import { addDays, ceil5, diffDays, fromMinutes, toMinutes } from "../time";

export interface TravelFn {
  (a: LatLng, b: LatLng): { minutes: number; mode: TravelMode; km: number };
}

export interface DraftActivity {
  title: string;
  category: ActivityCategory;
  startTime: string;
  durationMin: number;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  cost: number;
  notes: string | null;
  poiId: string | null;
  timeLocked: boolean;
  travelMinFromPrev: number | null;
}

export interface DraftDay {
  dayIndex: number;
  date: string;
  title: string;
  activities: DraftActivity[];
}

export interface FlightAnchor {
  /** datetime locale della destinazione, "YYYY-MM-DDTHH:mm" */
  at: string;
  airportCode: string;
  airportLocation: LatLng;
}

export interface GenerateInput {
  destinationName: string;
  center: LatLng;
  startDate: string;
  endDate: string;
  arrival?: FlightAnchor | null;
  departure?: FlightAnchor | null;
  hotel?: { name: string; location: LatLng } | null;
  pois: PointOfInterest[];
  pace: TripPace;
  interests?: string[];
  budgetLevel?: "basso" | "medio" | "alto";
  /** Costo medio di un pasto per persona */
  mealCost: number;
  travel: TravelFn;
  /** Solo queste giornate (rigenerazione parziale) */
  dayIndexes?: number[];
  /** POI già usati in altre giornate */
  excludePoiIds?: string[];
  /** Attività che l'utente ha modificato: restano ferme e il resto si pianifica attorno */
  fixedByDay?: Record<number, DraftActivity[]>;
}

interface PaceConfig {
  dayStart: number;
  dayEnd: number;
  maxSights: number;
  buffer: number;
  fill: number;
}

export const PACE_CONFIG: Record<TripPace, PaceConfig> = {
  rilassato: { dayStart: toMinutes("10:00"), dayEnd: toMinutes("21:30"), maxSights: 3, buffer: 20, fill: 0.55 },
  bilanciato: { dayStart: toMinutes("09:00"), dayEnd: toMinutes("22:30"), maxSights: 4, buffer: 10, fill: 0.7 },
  intenso: { dayStart: toMinutes("08:30"), dayEnd: toMinutes("23:30"), maxSights: 6, buffer: 5, fill: 0.85 },
};

const LUNCH = { from: toMinutes("12:15"), to: toMinutes("14:30"), duration: 70 };
const DINNER = { from: toMinutes("19:30"), to: toMinutes("21:30"), duration: 90 };
const EXCURSION_MIN = 240;

interface Frame {
  dayIndex: number;
  date: string;
  start: number;
  end: number;
  startLoc: LatLng;
  pre: DraftActivity[];
  post: DraftActivity[];
  fixed: DraftActivity[];
  isArrival: boolean;
  isDeparture: boolean;
}

type Scored = PointOfInterest & { score: number };

function activity(partial: Partial<DraftActivity> & Pick<DraftActivity, "title" | "category" | "startTime" | "durationMin">): DraftActivity {
  return {
    placeName: null, lat: null, lng: null, cost: 0, notes: null, poiId: null, timeLocked: false, travelMinFromPrev: null,
    ...partial,
  };
}

function scorePoi(p: PointOfInterest, interests: string[], budgetLevel: GenerateInput["budgetLevel"]): number {
  let s = p.popularity * 0.65;
  if (interests.length) {
    const hits = p.tags.filter((t) => interests.includes(t)).length + (interests.includes(p.category) ? 1 : 0);
    s += Math.min(hits, 2) * 0.18;
  }
  if (budgetLevel === "basso") s += p.cost === 0 ? 0.12 : p.cost > 25 ? -0.15 : 0;
  if (budgetLevel === "alto" && p.category === "esperienza") s += 0.08;
  return s;
}

function isExcursion(p: { durationMin: number }) {
  return p.durationMin >= EXCURSION_MIN;
}

function buildFrame(input: GenerateInput, dayIndex: number, totalDays: number, base: { name: string; location: LatLng }): Frame {
  const cfg = PACE_CONFIG[input.pace];
  const date = addDays(input.startDate, dayIndex);
  const frame: Frame = {
    dayIndex, date, start: cfg.dayStart, end: cfg.dayEnd, startLoc: base.location,
    pre: [], post: [], fixed: [...(input.fixedByDay?.[dayIndex] ?? [])].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    isArrival: false, isDeparture: false,
  };
  const at = (loc: LatLng, name: string) => ({ lat: loc.lat, lng: loc.lng, placeName: name });

  const arrival = input.arrival && input.arrival.at.slice(0, 10) === date ? input.arrival : null;
  const departure = input.departure && input.departure.at.slice(0, 10) === date ? input.departure : null;

  if (dayIndex === 0 || arrival) {
    frame.isArrival = true;
    if (arrival) {
      const t = toMinutes(arrival.at.slice(11, 16));
      const transfer = input.travel(arrival.airportLocation, base.location);
      const transferMin = Math.min(Math.max(transfer.minutes, 20), 90);
      frame.pre.push(
        activity({ title: `Arrivo a ${input.destinationName}`, category: "volo", startTime: fromMinutes(t), durationMin: 30,
          ...at(arrival.airportLocation, `Aeroporto ${arrival.airportCode}`), timeLocked: true }),
        activity({ title: "Trasferimento in alloggio", category: "trasporto", startTime: fromMinutes(t + 30), durationMin: transferMin,
          ...at(base.location, base.name), cost: transfer.km > 25 ? 10 : 5, notes: "Treno, navetta o metro dall'aeroporto" }),
      );
      const checkInAt = ceil5(t + 30 + transferMin);
      frame.pre.push(
        activity({ title: checkInAt < toMinutes("14:00") ? "Deposito bagagli" : "Check-in", category: "alloggio",
          startTime: fromMinutes(checkInAt), durationMin: 30, ...at(base.location, base.name) }),
      );
      frame.start = Math.max(cfg.dayStart, checkInAt + 30 + cfg.buffer);
    } else {
      frame.pre.push(
        activity({ title: `Arrivo e check-in`, category: "alloggio", startTime: fromMinutes(Math.max(cfg.dayStart, toMinutes("11:00"))),
          durationMin: 45, ...at(base.location, base.name) }),
      );
      frame.start = Math.max(cfg.dayStart, toMinutes("11:00")) + 45 + cfg.buffer;
    }
  }

  if (dayIndex === totalDays - 1 || departure) {
    frame.isDeparture = true;
    const checkout = activity({ title: "Check-out", category: "alloggio", startTime: "10:30", durationMin: 20, ...at(base.location, base.name) });
    if (departure) {
      const t = toMinutes(departure.at.slice(11, 16));
      const transfer = input.travel(base.location, departure.airportLocation);
      const transferMin = Math.min(Math.max(transfer.minutes, 20), 90);
      const leaveAt = t - 120 - transferMin; // 2h prima in aeroporto
      const checkoutAt = Math.min(toMinutes("10:30"), leaveAt - 20);
      checkout.startTime = fromMinutes(Math.max(0, checkoutAt));
      checkout.title = leaveAt - toMinutes("10:30") > 90 ? "Check-out e deposito bagagli" : "Check-out";
      if (frame.isArrival) frame.post.push(checkout);
      else frame.pre.push(checkout);
      frame.post.push(
        activity({ title: "Trasferimento in aeroporto", category: "trasporto", startTime: fromMinutes(Math.max(0, leaveAt)), durationMin: transferMin,
          ...at(departure.airportLocation, `Aeroporto ${departure.airportCode}`), cost: transfer.km > 25 ? 10 : 5 }),
        activity({ title: "Volo di ritorno", category: "volo", startTime: fromMinutes(t), durationMin: 30,
          ...at(departure.airportLocation, `Aeroporto ${departure.airportCode}`), timeLocked: true }),
      );
      if (!frame.isArrival) frame.start = Math.max(frame.start, toMinutes(checkout.startTime) + 20 + cfg.buffer);
      // tempo per tornare a riprendere i bagagli
      frame.end = Math.min(frame.end, leaveAt - 40);
    } else {
      if (frame.isArrival) frame.post.push(checkout);
      else {
        frame.pre.push(checkout);
        frame.start = Math.max(frame.start, toMinutes("10:50"));
      }
      frame.end = Math.min(frame.end, toMinutes("18:00"));
    }
  }
  return frame;
}

function overlapsWindow(start: number, end: number, w: { from: number; to: number }) {
  return start < w.to && end > w.from;
}

function capacityOf(f: Frame): number {
  let cap = f.end - f.start;
  if (overlapsWindow(f.start, f.end, LUNCH)) cap -= LUNCH.duration;
  if (overlapsWindow(f.start, f.end, DINNER)) cap -= DINNER.duration;
  for (const a of f.fixed) cap -= a.durationMin;
  return Math.max(0, cap);
}

function centroid(points: LatLng[]): LatLng {
  const n = points.length || 1;
  return { lat: points.reduce((s, p) => s + p.lat, 0) / n, lng: points.reduce((s, p) => s + p.lng, 0) / n };
}

/** Assegna i POI alle giornate per zone geografiche */
function assign(frames: Frame[], sights: Scored[], input: GenerateInput): Map<number, Scored[]> {
  const cfg = PACE_CONFIG[input.pace];
  const result = new Map<number, Scored[]>();
  const taken = new Set<string>();
  const ordered = [...frames].sort((a, b) => capacityOf(b) - capacityOf(a));
  // Quota proporzionale alla durata utile: con poche attrazioni non si svuotano i giorni di arrivo/partenza
  const totalCap = frames.reduce((s, f) => s + capacityOf(f), 0) || 1;

  for (const frame of ordered) {
    let budget = capacityOf(frame) * cfg.fill;
    const share = Math.max(1, Math.round((sights.length * capacityOf(frame)) / totalCap));
    const maxSights = Math.min(share, frame.isArrival || frame.isDeparture ? Math.max(1, cfg.maxSights - 2) : cfg.maxSights);
    const chosen: Scored[] = [];
    if (budget < 45) {
      result.set(frame.dayIndex, chosen);
      continue;
    }
    // Le escursioni di mezza/intera giornata solo nelle giornate piene
    const fits = (p: Scored) => !taken.has(p.id) && p.durationMin <= budget && (!isExcursion(p) || (!frame.isArrival && !frame.isDeparture));
    const seed = sights.find(fits);
    if (seed) {
      chosen.push(seed);
      taken.add(seed.id);
      budget -= seed.durationMin;
      if (isExcursion(seed)) budget = Math.min(budget, 120);
    }
    while (chosen.length < maxSights) {
      const c = centroid(chosen.length ? chosen.map((p) => p.location) : [frame.startLoc]);
      let best: Scored | null = null;
      let bestCost = Infinity;
      for (const p of sights) {
        if (!fits(p) || isExcursion(p)) continue;
        const km = input.travel(c, p.location).km;
        if (km > 7) continue; // stessa zona della città
        const cost = km - p.score * 2.5;
        if (cost < bestCost) {
          bestCost = cost;
          best = p;
        }
      }
      if (!best) break;
      chosen.push(best);
      taken.add(best.id);
      budget -= best.durationMin + 15;
    }
    result.set(frame.dayIndex, chosen);
  }
  return result;
}

function timePenalty(p: PointOfInterest, start: number): number {
  if (p.bestTime === "sera" && start < toMinutes("17:30")) return 150;
  if (p.bestTime === "mattina" && start > toMinutes("12:30")) return 60;
  if (p.bestTime === "pomeriggio" && start < toMinutes("12:00")) return 30;
  return 0;
}

function schedule(frame: Frame, sights: Scored[], input: GenerateInput, usedRestaurants: Set<string>, nightlife: PointOfInterest[], restaurants: PointOfInterest[]): DraftActivity[] {
  const cfg = PACE_CONFIG[input.pace];
  const out: DraftActivity[] = [...frame.pre];
  const fixed = [...frame.fixed];
  let now = frame.start;
  let pos = frame.startLoc;
  const remaining = [...sights];
  const covers = (w: { from: number; to: number }) => frame.start <= w.to - 30 && frame.end >= w.from + 60;
  let lunchDone = !covers(LUNCH);
  let dinnerDone = !covers(DINNER);
  const travelTo = (to: LatLng, excursion = false) => {
    const t = input.travel(pos, to);
    return excursion ? Math.min(t.minutes, 30) : t.minutes;
  };

  const push = (a: DraftActivity, travelMin: number) => {
    out.push({ ...a, travelMinFromPrev: travelMin });
    now = toMinutes(a.startTime) + a.durationMin + cfg.buffer;
    if (a.lat != null && a.lng != null) pos = { lat: a.lat, lng: a.lng };
  };

  /** Inserisce i blocchi fissi dell'utente che cadono prima di `until` */
  const flushFixed = (until: number) => {
    while (fixed.length && toMinutes(fixed[0].startTime) <= until) {
      const f = fixed.shift()!;
      const travel = f.lat != null && f.lng != null ? travelTo({ lat: f.lat, lng: f.lng }) : 0;
      push(f, travel);
      now = Math.max(now, toMinutes(f.startTime) + f.durationMin + cfg.buffer);
    }
  };

  const placeMeal = (kind: "pranzo" | "cena") => {
    const w = kind === "pranzo" ? LUNCH : DINNER;
    const options = restaurants
      .filter((r) => !usedRestaurants.has(r.id))
      .map((r) => ({ r, t: input.travel(pos, r.location) }))
      .filter(({ r, t }) => t.km < 3 && toMinutes(r.opening.open) <= Math.max(now, w.from) + t.minutes && toMinutes(r.opening.close) >= w.from + w.duration)
      .filter(({ r }) => (kind === "cena" ? r.bestTime !== "mattina" : r.bestTime !== "sera"))
      .sort((a, b) => a.t.minutes - b.t.minutes);
    const pick = options[0];
    if (pick) {
      usedRestaurants.add(pick.r.id);
      const start = ceil5(Math.max(now + pick.t.minutes, w.from));
      push(activity({ title: pick.r.name, category: "ristorante", startTime: fromMinutes(start), durationMin: kind === "cena" ? w.duration : Math.max(45, Math.min(pick.r.durationMin, w.duration)),
        placeName: pick.r.name, lat: pick.r.location.lat, lng: pick.r.location.lng, cost: pick.r.cost, poiId: pick.r.id, notes: pick.r.description }), pick.t.minutes);
    } else {
      const start = ceil5(Math.max(now, w.from));
      push(activity({ title: kind === "pranzo" ? "Pranzo in zona" : "Cena in zona", category: "ristorante", startTime: fromMinutes(start),
        durationMin: kind === "pranzo" ? 60 : w.duration, placeName: "Nei dintorni", lat: pos.lat, lng: pos.lng,
        cost: Math.round(input.mealCost * (kind === "cena" ? 1.3 : 0.9)) }), 0);
    }
  };

  for (let guard = 0; guard < 40; guard++) {
    flushFixed(now + 15);
    if (!lunchDone && now >= LUNCH.from && now <= LUNCH.to) {
      placeMeal("pranzo");
      lunchDone = true;
      continue;
    }
    if (!dinnerDone && now >= DINNER.from && now <= DINNER.to) {
      placeMeal("cena");
      dinnerDone = true;
      continue;
    }
    // Pranzo "assorbito" da un'attività lunga che copre l'ora di pranzo
    if (!lunchDone && now > LUNCH.to) lunchDone = true;

    let best: { p: Scored; start: number; travel: number } | null = null;
    let bestCost = Infinity;
    const nextFixedAt = fixed.length ? toMinutes(fixed[0].startTime) : Infinity;
    for (const p of remaining) {
      const travel = travelTo(p.location, isExcursion(p));
      const arrive = ceil5(now + travel);
      const start = Math.max(arrive, toMinutes(p.opening.open));
      const end = start + p.durationMin;
      if (end > Math.min(toMinutes(p.opening.close), frame.end)) continue;
      if (end + 10 > nextFixedAt) continue;
      // Non saltare il pranzo con attività brevi che lo scavalcano
      const crossesLunch = !lunchDone && start < LUNCH.from && end > LUNCH.to && p.durationMin < 200;
      const crossesDinner = !dinnerDone && start < DINNER.from && end > DINNER.to;
      if (crossesDinner) continue;
      const cost = travel + (start - arrive) * 0.6 + timePenalty(p, start) + (crossesLunch ? 45 : 0) - p.score * 40;
      if (cost < bestCost) {
        bestCost = cost;
        best = { p, start, travel };
      }
    }

    if (!best) {
      // Nessuna tappa possibile ora: salta al prossimo evento della giornata
      const nextEvents = [
        !lunchDone && now < LUNCH.from ? LUNCH.from : Infinity,
        !dinnerDone && now < DINNER.from ? DINNER.from : Infinity,
        nextFixedAt,
      ].filter((t) => t < frame.end + 120);
      const next = Math.min(...nextEvents);
      if (!Number.isFinite(next) || next <= now) break;
      now = next;
      continue;
    }

    const { p, start, travel } = best;
    remaining.splice(remaining.indexOf(p), 1);
    push(activity({ title: p.name, category: p.category, startTime: fromMinutes(start), durationMin: p.durationMin, placeName: p.name,
      lat: p.location.lat, lng: p.location.lng, cost: p.cost, poiId: p.id,
      notes: isExcursion(p) ? `${p.description} Durata comprensiva di trasferimento.` : p.description }), travel);
  }

  if (!dinnerDone && now <= DINNER.to && frame.end >= DINNER.from) placeMeal("cena");

  // Serata: nightlife per chi la cerca o per ritmo intenso
  const wantsNight = input.pace === "intenso" || (input.interests ?? []).includes("nightlife");
  if (wantsNight && !frame.isDeparture && now >= DINNER.from) {
    const night = nightlife.find((n) => !usedRestaurants.has(n.id));
    if (night) {
      usedRestaurants.add(night.id);
      const travel = travelTo(night.location);
      const start = ceil5(Math.max(now + travel, toMinutes(night.opening.open), toMinutes("21:30")));
      if (start + 60 <= toMinutes("23:59")) {
        push(activity({ title: night.name, category: "nightlife", startTime: fromMinutes(start), durationMin: Math.min(night.durationMin, toMinutes("23:59") - start),
          placeName: night.name, lat: night.location.lat, lng: night.location.lng, cost: night.cost, poiId: night.id, notes: night.description }), travel);
      }
    }
  }

  flushFixed(Infinity);
  for (const a of frame.post) {
    const isTransfer = a.category === "trasporto" || a.category === "volo";
    const travel = !isTransfer && a.lat != null && a.lng != null ? travelTo({ lat: a.lat, lng: a.lng }) : null;
    out.push({ ...a, travelMinFromPrev: travel });
    if (a.lat != null && a.lng != null) pos = { lat: a.lat, lng: a.lng };
  }
  return out.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

function dayTitle(frame: Frame, acts: DraftActivity[], destinationName: string): string {
  if (frame.isArrival && frame.isDeparture) return `Giornata a ${destinationName}`;
  if (frame.isArrival) return `Arrivo a ${destinationName}`;
  if (frame.isDeparture) return "Ultimo giro e partenza";
  const main = acts.find((a) => a.poiId && a.category !== "ristorante" && a.category !== "nightlife");
  return main ? `${main.title.split(" e ")[0]} e dintorni` : "Giornata libera";
}

export function generateItinerary(input: GenerateInput): DraftDay[] {
  const totalDays = Math.max(1, diffDays(input.startDate, input.endDate) + 1);
  const base = input.hotel ?? { name: `Centro di ${input.destinationName}`, location: input.center };
  const dayIndexes = (input.dayIndexes ?? Array.from({ length: totalDays }, (_, i) => i)).filter((i) => i >= 0 && i < totalDays);
  const exclude = new Set(input.excludePoiIds ?? []);
  for (const fixed of Object.values(input.fixedByDay ?? {})) for (const a of fixed) if (a.poiId) exclude.add(a.poiId);

  const interests = input.interests ?? [];
  const available = input.pois.filter((p) => !exclude.has(p.id));
  const restaurants = available.filter((p) => p.category === "ristorante");
  const nightlife = available.filter((p) => p.category === "nightlife");
  const sights: Scored[] = available
    .filter((p) => p.category !== "ristorante" && p.category !== "nightlife")
    .map((p) => ({ ...p, score: scorePoi(p, interests, input.budgetLevel) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const frames = dayIndexes.map((i) => buildFrame(input, i, totalDays, base));
  const assignment = assign(frames, sights, input);
  const usedRestaurants = new Set<string>();

  return frames
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((frame) => {
      const acts = schedule(frame, assignment.get(frame.dayIndex) ?? [], input, usedRestaurants, nightlife, restaurants);
      return { dayIndex: frame.dayIndex, date: frame.date, title: dayTitle(frame, acts, input.destinationName), activities: acts };
    });
}
