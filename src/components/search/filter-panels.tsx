"use client";

import type { ReactNode } from "react";
import type { AccommodationOffer, AccommodationType, FlightOffer } from "@/lib/types";
import type { FlightFilters, StayFilters, TimeSlot } from "@/lib/filters";
import { STAY_TYPE_LABEL } from "@/components/stays/stay-card";
import { cn, formatPrice } from "@/lib/format";
import { formatDuration } from "@/lib/time";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line py-4 last:border-0">
      <legend className="mb-2.5 pt-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("press rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150", active ? "border-ink bg-ink text-white" : "border-line bg-surface hoverable:hover:border-ink/30")}>
      {children}
    </button>
  );
}

function Range({ label, min, max, step, value, onChange, format }: { label: string; min: number; max: number; step: number; value: number | null; onChange: (v: number | null) => void; format: (v: number) => string }) {
  const current = value ?? max;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tabular-nums">{value == null ? "Qualsiasi" : format(current)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={current} onChange={(e) => onChange(Number(e.target.value) >= max ? null : Number(e.target.value))} className="w-full accent-brand-500" aria-label={label} />
    </div>
  );
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function FlightFilterPanel({ offers, value, onChange }: { offers: FlightOffer[]; value: FlightFilters; onChange: (f: FlightFilters) => void }) {
  if (!offers.length) return null;
  const prices = offers.map((o) => o.price);
  const durations = offers.map((o) => o.durationMin);
  const airlines = [...new Set(offers.map((o) => o.airline))].sort();
  const stopAirports = [...new Set(offers.flatMap((o) => o.stopCodes))].sort();
  // Alcuni provider non comunicano i bagagli nei risultati: in quel caso il filtro non avrebbe senso
  const baggageKnown = offers.some((o) => o.baggage.cabin !== null || o.baggage.checked !== null);
  const set = (patch: Partial<FlightFilters>) => onChange({ ...value, ...patch });
  const SLOTS: { key: TimeSlot; label: string }[] = [
    { key: "mattina", label: "🌅 Mattina" },
    { key: "pomeriggio", label: "☀️ Pomeriggio" },
    { key: "sera", label: "🌙 Sera" },
  ];
  return (
    <div>
      <Section title="Prezzo">
        <Range label="Fino a" min={Math.min(...prices)} max={Math.max(...prices)} step={5} value={value.maxPrice} onChange={(v) => set({ maxPrice: v })} format={formatPrice} />
      </Section>
      <Section title="Scali">
        <div className="flex flex-wrap gap-2">
          <Chip active={value.maxStops === null} onClick={() => set({ maxStops: null })}>Qualsiasi</Chip>
          <Chip active={value.maxStops === 0} onClick={() => set({ maxStops: 0 })}>Solo diretti</Chip>
          <Chip active={value.maxStops === 1} onClick={() => set({ maxStops: 1 })}>Max 1 scalo</Chip>
        </div>
      </Section>
      <Section title="Durata">
        <Range label="Al massimo" min={Math.min(...durations)} max={Math.max(...durations)} step={15} value={value.maxDurationMin} onChange={(v) => set({ maxDurationMin: v })} format={formatDuration} />
      </Section>
      <Section title="Orario di partenza">
        <div className="flex flex-wrap gap-2">
          {SLOTS.map((s) => (
            <Chip key={s.key} active={value.slots.includes(s.key)} onClick={() => set({ slots: toggle(value.slots, s.key) })}>
              {s.label}
            </Chip>
          ))}
        </div>
      </Section>
      {baggageKnown && (
        <Section title="Bagaglio">
          <div className="flex flex-wrap gap-2">
            <Chip active={value.cabinBag} onClick={() => set({ cabinBag: !value.cabinBag })}>Trolley incluso</Chip>
            <Chip active={value.checkedBag} onClick={() => set({ checkedBag: !value.checkedBag })}>Stiva inclusa</Chip>
          </div>
        </Section>
      )}
      <Section title="Compagnia">
        <div className="flex flex-wrap gap-2">
          {airlines.map((a) => (
            <Chip key={a} active={value.airlines.includes(a)} onClick={() => set({ airlines: toggle(value.airlines, a) })}>
              {a}
            </Chip>
          ))}
        </div>
      </Section>
      {stopAirports.length > 0 && (
        <Section title="Aeroporti di scalo da evitare">
          <div className="flex flex-wrap gap-2">
            {stopAirports.map((c) => (
              <Chip key={c} active={value.avoidStopAirports.includes(c)} onClick={() => set({ avoidStopAirports: toggle(value.avoidStopAirports, c) })}>
                {c}
              </Chip>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

const AMENITY_FILTERS = ["Wi-Fi", "Cucina", "Colazione", "Aria condizionata", "Piscina", "Lavatrice"];

export function StayFilterPanel({ offers, value, onChange }: { offers: AccommodationOffer[]; value: StayFilters; onChange: (f: StayFilters) => void }) {
  if (!offers.length) return null;
  const prices = offers.map((o) => o.pricePerNight);
  const types = [...new Set(offers.map((o) => o.type))] as AccommodationType[];
  const set = (patch: Partial<StayFilters>) => onChange({ ...value, ...patch });
  return (
    <div>
      <Section title="Prezzo a notte">
        <Range label="Fino a" min={Math.min(...prices)} max={Math.max(...prices)} step={5} value={value.maxPricePerNight} onChange={(v) => set({ maxPricePerNight: v })} format={formatPrice} />
      </Section>
      <Section title="Valutazione">
        <div className="flex flex-wrap gap-2">
          {[null, 7, 8, 9].map((r) => (
            <Chip key={String(r)} active={value.minRating === r} onClick={() => set({ minRating: r })}>
              {r == null ? "Qualsiasi" : `${r}+`}
            </Chip>
          ))}
        </div>
      </Section>
      <Section title="Posizione">
        <div className="flex flex-wrap gap-2">
          {[null, 1, 2, 4].map((d) => (
            <Chip key={String(d)} active={value.maxDistanceKm === d} onClick={() => set({ maxDistanceKm: d })}>
              {d == null ? "Qualsiasi" : `Entro ${d} km dal centro`}
            </Chip>
          ))}
        </div>
      </Section>
      <Section title="Tipologia">
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <Chip key={t} active={value.types.includes(t)} onClick={() => set({ types: toggle(value.types, t) })}>
              {STAY_TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </Section>
      <Section title="Servizi">
        <div className="flex flex-wrap gap-2">
          {AMENITY_FILTERS.map((a) => (
            <Chip key={a} active={value.amenities.includes(a)} onClick={() => set({ amenities: toggle(value.amenities, a) })}>
              {a}
            </Chip>
          ))}
        </div>
      </Section>
      <Section title="Condizioni">
        <Chip active={value.freeCancellation} onClick={() => set({ freeCancellation: !value.freeCancellation })}>
          Cancellazione gratuita
        </Chip>
      </Section>
    </div>
  );
}
