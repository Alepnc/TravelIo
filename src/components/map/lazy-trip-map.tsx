"use client";

import dynamic from "next/dynamic";

/** Leaflet usa `window`: niente SSR, e il bundle della mappa si carica solo quando serve. */
export const LazyTripMap = dynamic(() => import("./trip-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#eef0ec] text-sm text-muted">
      <span className="animate-pulse">Carico la mappa…</span>
    </div>
  ),
});
