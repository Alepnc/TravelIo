import "server-only";
/**
 * Motore a regole (modalità demo senza ANTHROPIC_API_KEY).
 * Copre le richieste più comuni in italiano con pattern semplici e fuzzy matching sui nomi.
 * Non pretende di capire tutto: quando non capisce, lo dice e suggerisce come chiedere.
 */
import type { AssistantOperation, AssistantReply } from "@/lib/assistant";
import type { ItineraryActivity, PointOfInterest } from "@/lib/types";
import { estimateTravel } from "@/lib/geo";
import { formatPrice } from "@/lib/format";
import type { AssistantContext } from "./context";
import { toProposals } from "./context";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const STOP = new Set(["di", "del", "della", "dei", "il", "la", "le", "lo", "un", "una", "al", "alla", "e", "a", "in", "per", "con", "visita", "giro", "museo"]);

function tokens(s: string) {
  return norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t));
}

/** Punteggio di somiglianza testo ↔ nome (quota di token del nome trovati nel testo) */
function similarity(text: string, name: string): number {
  const t = new Set(tokens(text));
  const n = tokens(name);
  if (!n.length) return 0;
  return n.filter((x) => t.has(x) || [...t].some((y) => y.length > 4 && (x.startsWith(y) || y.startsWith(x)))).length / n.length;
}

function bestMatch<T>(text: string, items: T[], name: (x: T) => string, min = 0.34): T | null {
  let best: T | null = null;
  let score = min;
  for (const item of items) {
    const s = similarity(text, name(item));
    if (s > score) {
      score = s;
      best = item;
    }
  }
  return best;
}

function dayFromText(text: string, total: number): number | null {
  const m = norm(text).match(/giorno\s*(\d{1,2})|(\d{1,2})\s*(?:°|o)?\s*giorno/);
  if (m) {
    const n = Number(m[1] ?? m[2]) - 1;
    return n >= 0 && n < total ? n : null;
  }
  if (/\bdomani\b|\bsecondo giorno\b/.test(norm(text))) return Math.min(1, total - 1);
  if (/\bultimo giorno\b/.test(norm(text))) return total - 1;
  return null;
}

const NUM = { uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10 } as Record<string, number>;

export function ruleBasedReply(message: string, ctx: AssistantContext): AssistantReply {
  const text = norm(message);
  const trip = ctx.trip;
  const days = trip?.itinerary?.days ?? [];
  const acts = days.flatMap((d) => d.activities);
  const focus = dayFromText(message, days.length) ?? ctx.focusDayIndex ?? 0;
  const ops: AssistantOperation[] = [];
  const say = (reply: string) => ({ reply, proposals: toProposals(ops, ctx), engine: "regole" as const });

  // "Organizzami 5 giorni a Parigi spendendo massimo 600 €"
  const plan = text.match(/(\d{1,2}|uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+giorni\s+(?:a|ad|in)\s+([a-z' -]+?)(?:\s+(?:spendendo|con|budget|massimo|max|per)|[.,!?]|$)/);
  if (plan) {
    const days = Number(plan[1]) || NUM[plan[1]] || 3;
    const dest = bestMatch(plan[2], ctx.destinations, (d) => d.name, 0.5) ?? ctx.destinations.find((d) => norm(d.name).startsWith(plan[2].trim().slice(0, 4)));
    const budget = text.match(/(\d{2,5})\s*(?:€|euro)|€\s*(\d{2,5})/);
    if (!dest) return say(`Non ho ancora "${plan[2].trim()}" tra le destinazioni disponibili. Prova con una delle mete in Ispirazione.`);
    const perPerson = budget ? Number(budget[1] ?? budget[2]) : null;
    const travelers = Number(text.match(/(\d{1,2})\s*(?:persone|amici|viaggiatori)/)?.[1]) || null;
    ops.push({ type: "create_trip", destinationId: dest.id, days, budgetPerPerson: perPerson, travelers });
    const estimate = dest.avgNightlyPrice * (days - 1) / 2 + dest.dailyCost * days;
    return say(
      `Ottima idea! ${dest.name} per ${days} giorni costa in media circa ${formatPrice(estimate)} a persona tra alloggio e spese giornaliere, voli esclusi.` +
        (perPerson ? (estimate > perPerson ? ` Con ${formatPrice(perPerson)} sarà stretto: punterei su ostelli e attività gratuite.` : ` Con ${formatPrice(perPerson)} ci stai dentro.`) : "") +
        " Creo il viaggio e poi genero l'itinerario?",
    );
  }

  if (!trip) return say("Dimmi dove e per quanti giorni vuoi partire, ad esempio: \"Organizzami 4 giorni a Lisbona spendendo massimo 500 €\".");
  if (!trip.itinerary) return say("Genera prima l'itinerario: poi posso aggiungere, togliere o spostare attività per te.");

  const focusDay = days[focus];
  const usedPoi = new Set(acts.map((a) => a.poiId).filter(Boolean));

  // Giornata tranquilla / intensa
  if (/tranquill|rilassat|riposo|calm|lent/.test(text)) {
    ops.push({ type: "regenerate_day", dayIndex: focus, pace: "rilassato" });
    return say(`Ok, rendo più tranquillo il giorno ${focus + 1}: meno tappe, partenza più tardi e pause più lunghe. Le attività che hai modificato tu restano dove sono.`);
  }
  if (/intens|piu cose|più cose|pien/.test(text) && /giorn/.test(text)) {
    ops.push({ type: "regenerate_day", dayIndex: focus, pace: "intenso" });
    return say(`Riempio di più il giorno ${focus + 1}, mantenendo le tappe vicine tra loro.`);
  }

  const findActivity = (): ItineraryActivity | null =>
    bestMatch(message, acts.filter((a) => a.category !== "volo"), (a) => a.title) ??
    (/questa|questo/.test(text) ? focusDay?.activities.find((a) => a.poiId && a.category !== "ristorante") ?? null : null);

  // Più economico
  if (/economic|meno car|risparmi|gratis|gratuit/.test(text)) {
    const target = findActivity() ?? [...(focusDay?.activities ?? [])].filter((a) => a.poiId).sort((a, b) => b.cost - a.cost)[0];
    if (!target || target.lat == null || target.lng == null) return say("Dimmi quale attività vuoi sostituire, ad esempio: \"togli la Sagrada Família e trovami qualcosa di più economico\".");
    const near = (p: PointOfInterest) => estimateTravel({ lat: target.lat!, lng: target.lng! }, p.location).minutes;
    const alt = ctx.pois
      .filter((p) => !usedPoi.has(p.id) && p.cost < target.cost && !["ristorante", "nightlife"].includes(p.category) === !["ristorante", "nightlife"].includes(target.category))
      .sort((a, b) => a.cost - b.cost || near(a) - near(b))[0];
    if (!alt) return say(`"${target.title}" è già tra le opzioni più economiche disponibili.`);
    ops.push({ type: "replace_activity", activityId: target.id, poiId: alt.id });
    return say(`Al posto di "${target.title}" (${formatPrice(target.cost)}) ti propongo "${alt.name}" (${alt.cost ? formatPrice(alt.cost) : "gratis"}), a ${near(alt)} minuti di distanza.`);
  }

  // Rimuovi
  if (/\b(togli|rimuov|elimin|cancell|salta)/.test(text)) {
    const target = findActivity();
    if (!target) return say("Quale attività vuoi togliere? Scrivi il suo nome.");
    ops.push({ type: "remove_activity", activityId: target.id });
    return say(`Tolgo "${target.title}". Gli altri orari restano invariati, così ti resta tempo libero.`);
  }

  // Sposta
  if (/\bspost/.test(text)) {
    const target = findActivity();
    const to = dayFromText(message, days.length);
    if (!target || to == null) return say("Dimmi cosa spostare e in quale giorno, ad esempio: \"sposta il Pantheon al giorno 3\".");
    ops.push({ type: "move_activity", activityId: target.id, toDayIndex: to });
    return say(`Sposto "${target.title}" al giorno ${to + 1} e ricalcolo gli orari.`);
  }

  // Aggiungi
  if (/\b(aggiung|inserisc|metti|vorrei vedere|voglio vedere|visita)/.test(text)) {
    const poi = bestMatch(message, ctx.pois.filter((p) => !usedPoi.has(p.id)), (p) => p.name);
    if (!poi) {
      const already = bestMatch(message, acts, (a) => a.title);
      if (already) return say(`"${already.title}" è già nel tuo itinerario.`);
      return say("Non ho trovato quel luogo tra le attività disponibili. Puoi aggiungerlo a mano con \"+ Aggiungi attività\".");
    }
    // Giorno con tappe più vicine, se l'utente non lo specifica
    let dayIndex = dayFromText(message, days.length);
    if (dayIndex == null) {
      let bestDist = Infinity;
      for (const d of days) {
        for (const a of d.activities) {
          if (a.lat == null || a.lng == null) continue;
          const m = estimateTravel({ lat: a.lat, lng: a.lng }, poi.location).minutes;
          if (m < bestDist) {
            bestDist = m;
            dayIndex = d.dayIndex;
          }
        }
      }
    }
    const day = days[dayIndex ?? focus];
    const last = [...day.activities].reverse().find((a) => a.category !== "volo" && a.category !== "trasporto");
    const start = poi.bestTime === "sera" ? "18:00" : poi.bestTime === "mattina" ? "10:00" : "15:00";
    ops.push({ type: "add_activity", dayIndex: day.dayIndex, poiId: poi.id, title: null, category: null, startTime: start, durationMin: null, cost: null });
    return say(
      `Aggiungo "${poi.name}" al giorno ${day.dayIndex + 1}${last ? `, vicino a "${last.title}"` : ""}. Dura circa ${poi.durationMin} minuti${poi.cost ? ` e costa ${formatPrice(poi.cost)} a persona` : " ed è gratuito"}.`,
    );
  }

  return say(
    "Posso aiutarti a modificare l'itinerario. Prova con: \"aggiungi una visita al Louvre\", \"togli questa attività e trovami qualcosa di più economico\", \"vorrei una giornata tranquilla\" o \"sposta il museo al giorno 3\".",
  );
}
