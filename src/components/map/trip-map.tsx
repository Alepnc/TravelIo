"use client";

/**
 * Mappa dell'itinerario (Leaflet + tile OpenStreetMap/CARTO, nessuna API key).
 * Caricata solo lato client e solo nella pagina itinerario (vedi `lazy-trip-map.tsx`).
 */
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import type { LatLng } from "@/lib/types";
import type { MapStop } from "@/lib/itinerary/stops";
import { CATEGORY_META } from "@/components/itinerary/category";

export interface MapLayer {
  key: string;
  color: string;
  stops: MapStop[];
  dimmed?: boolean;
}

function numberIcon(n: number, color: string, active: boolean) {
  const size = active ? 34 : 28;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;background:${color};color:#fff;border:3px solid #fff;border-radius:999px;display:flex;align-items:center;justify-content:center;font:700 ${active ? 14 : 12}px/1 Inter Variable,system-ui;box-shadow:0 4px 12px rgb(0 0 0 / .28);transition:transform .15s">${n}</div>`,
  });
}

const hotelIcon = L.divIcon({
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: `<div style="width:34px;height:34px;background:#13131c;border:3px solid #fff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 12px rgb(0 0 0 / .3)">🏨</div>`,
});

function FitBounds({ points, fallback }: { points: [number, number][]; fallback: LatLng }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      // Parte della mappa può essere sotto il bordo della finestra (prima dello scroll): la escludiamo dal fit
      const rect = map.getContainer().getBoundingClientRect();
      const hiddenBottom = Math.max(0, Math.min(rect.height * 0.6, rect.bottom - window.innerHeight));
      if (points.length >= 2) map.fitBounds(points, { paddingTopLeft: [56, 72], paddingBottomRight: [56, 56 + hiddenBottom], maxZoom: 15 });
      else if (points.length === 1) map.setView(points[0], 14);
      else map.setView([fallback.lat, fallback.lng], 13);
    };
    fit();
    // Il contenitore può nascere nascosto (vista Lista su mobile): rifacciamo il fit quando cambia dimensione
    let last = "";
    const ro = new ResizeObserver(([entry]) => {
      const size = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`;
      if (size !== last && entry.contentRect.width > 0) {
        last = size;
        fit();
      }
    });
    ro.observe(map.getContainer());
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function TripMap({ layers, hotel, center, activeIds, onSelect }: { layers: MapLayer[]; hotel: { name: string; location: LatLng } | null; center: LatLng; activeIds: Set<string>; onSelect: (activityId: string) => void }) {
  const fitPoints = useMemo(() => {
    const visible = layers.filter((l) => !l.dimmed);
    // Escursioni lontane (aeroporto, gite) non devono "zoomare fuori" tutta la città
    const pts = visible.flatMap((l) => l.stops.filter((s) => s.category !== "volo").map((s) => [s.lat, s.lng] as [number, number]));
    return pts.length ? pts : hotel ? [[hotel.location.lat, hotel.location.lng] as [number, number]] : [];
  }, [layers, hotel]);

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom zoomControl={false} className="h-full w-full" attributionControl>
      <ZoomControl position="bottomright" />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <FitBounds points={fitPoints} fallback={center} />
      {hotel && (
        <Marker position={[hotel.location.lat, hotel.location.lng]} icon={hotelIcon} zIndexOffset={500}>
          <Tooltip direction="top" offset={[0, -16]}>{hotel.name}</Tooltip>
        </Marker>
      )}
      {layers.map((layer) => (
        <Fragment key={layer.key}>
          <Polyline positions={layer.stops.map((s) => [s.lat, s.lng])} pathOptions={{ color: layer.color, weight: 4, opacity: layer.dimmed ? 0.2 : 0.75, dashArray: "2 8", lineCap: "round" }} />
          {layer.stops.map((s) => {
            const active = s.activityIds.some((id) => activeIds.has(id));
            return (
              <Marker
                key={`${layer.key}-${s.number}`}
                position={[s.lat, s.lng]}
                icon={numberIcon(s.number, layer.dimmed ? "#9ca3af" : layer.color === "category" ? CATEGORY_META[s.category].color : layer.color, active)}
                zIndexOffset={active ? 1000 : layer.dimmed ? -100 : 0}
                eventHandlers={{ click: () => onSelect(s.activityIds[0]) }}
                keyboard
                title={s.title}
              >
                <Tooltip direction="top" offset={[0, -14]}>
                  {s.number}. {s.title}
                </Tooltip>
              </Marker>
            );
          })}
        </Fragment>
      ))}
    </MapContainer>
  );
}
