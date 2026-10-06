import type { LatLng } from "./types";

const R = 6371; // km

/** Distanza in linea d'aria (km) */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

export type TravelMode = "piedi" | "mezzi" | "auto";

/**
 * Stima euristica del tempo di spostamento urbano.
 * Usata dal MockMapsProvider e lato client per ricalcoli istantanei dopo un drag & drop.
 * Fattore 1.3 per passare da linea d'aria a percorso reale.
 */
export function estimateTravel(a: LatLng, b: LatLng): { minutes: number; mode: TravelMode; km: number } {
  const km = haversineKm(a, b) * 1.3;
  if (km < 0.05) return { minutes: 0, mode: "piedi", km };
  if (km <= 1.6) return { minutes: Math.max(3, Math.round((km / 4.8) * 60)), mode: "piedi", km };
  if (km <= 15) return { minutes: Math.round(10 + (km / 18) * 60), mode: "mezzi", km };
  return { minutes: Math.round(15 + (km / 45) * 60), mode: "auto", km };
}
