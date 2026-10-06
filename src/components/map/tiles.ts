/**
 * Sfondo della mappa (tile raster). Il default è OpenStreetMap: non richiede chiavi, ma la sua policy
 * (https://operations.osmfoundation.org/policies/tiles/) ne ammette solo un uso leggero. Per un sito con
 * molto traffico usa un fornitore di tile (MapTiler, Stadia Maps, Thunderforest…) impostando queste variabili
 * in .env.local; sono NEXT_PUBLIC_ perché la mappa gira nel browser e vengono lette alla build.
 *
 *   NEXT_PUBLIC_MAP_TILE_URL=https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=LA_TUA_CHIAVE
 *   NEXT_PUBLIC_MAP_ATTRIBUTION=&copy; MapTiler &copy; OpenStreetMap contributors
 *
 * Una chiave per tile usata nel browser è visibile a chiunque: limitala per dominio dal pannello del fornitore.
 */
export const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const TILE_MAX_ZOOM = Number(process.env.NEXT_PUBLIC_MAP_MAX_ZOOM) || 19;
