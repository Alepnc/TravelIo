/** Utility per orari "HH:mm" e date "YYYY-MM-DD" senza dipendenze dal fuso del browser. */

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(min: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Arrotonda ai 5 minuti successivi: gli orari "21:07" sembrano finti. */
export function ceil5(min: number): number {
  return Math.ceil(min / 5) * 5;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${String(m).padStart(2, "0")}m` : `${h}h`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()) / 86_400_000);
}

export function todayISO(): string {
  return toISODate(new Date());
}

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MONTHS_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const WEEKDAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

export function monthName(m: number, short = false): string {
  const name = (short ? MONTHS_SHORT : MONTHS)[(m - 1 + 12) % 12];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** "12 ago" / "12 agosto 2027" */
export function formatDate(iso: string, opts: { year?: boolean; weekday?: boolean; long?: boolean } = {}): string {
  const d = parseISODate(iso);
  const parts = [] as string[];
  if (opts.weekday) parts.push(WEEKDAYS[d.getUTCDay()]);
  parts.push(String(d.getUTCDate()));
  parts.push((opts.long ? MONTHS : MONTHS_SHORT)[d.getUTCMonth()]);
  if (opts.year) parts.push(String(d.getUTCFullYear()));
  return parts.join(" ");
}

export function formatDateRange(start: string, end: string): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDate(start, { year: !sameYear })} → ${formatDate(end, { year: true })}`;
}

/** Ore e minuti da un datetime locale "YYYY-MM-DDTHH:mm" */
export function timeOf(isoDateTime: string): string {
  return isoDateTime.slice(11, 16);
}
