import { twMerge } from "tailwind-merge";

/**
 * Formattazione deterministica (niente Intl): Node e browser hanno dati ICU diversi
 * (es. "1200 €" vs "1.200 €") e la differenza rompe l'idratazione di React.
 */
export function formatNumber(value: number): string {
  const n = Math.round(value);
  const sign = n < 0 ? "-" : "";
  return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatPrice(value: number): string {
  // Spazio non separabile: il simbolo € non deve mai andare a capo da solo
  return `${formatNumber(value)}\u00a0€`;
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace(".", ",")} km`;
}

/** Bandiera emoji dal codice ISO del paese */
export function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Unisce classi Tailwind risolvendo i conflitti (l'ultima vince: "inline-flex hidden" → "hidden") */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
