"use client";

import { useActionState, useMemo, useState } from "react";
import { BedDouble, Minus, Plane, Plus, X } from "lucide-react";
import type { FormState } from "@/app/actions/state";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useDraft } from "@/components/draft/draft-provider";
import type { SearchOption } from "@/components/search/search-widget";
import type { TripPace } from "@/lib/types";
import { cn, formatPrice } from "@/lib/format";
import { addDays, diffDays, monthName, parseISODate, todayISO } from "@/lib/time";

export interface TripFormValues {
  name?: string;
  destinationId?: string;
  originCode?: string;
  startDate?: string;
  endDate?: string;
  travelersCount?: number;
  budgetPerPerson?: number | null;
  pace?: TripPace;
}

const PACES: { key: TripPace; label: string; hint: string }[] = [
  { key: "rilassato", label: "🌿 Rilassato", hint: "2-3 tappe al giorno" },
  { key: "bilanciato", label: "⚖️ Bilanciato", hint: "3-4 tappe" },
  { key: "intenso", label: "⚡ Intenso", hint: "Vedere tutto" },
];

export function TripForm({
  action,
  origins,
  destinations,
  initial = {},
  useDraftSelection = false,
  submitLabel = "Salva viaggio",
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  origins: SearchOption[];
  destinations: SearchOption[];
  initial?: TripFormValues;
  useDraftSelection?: boolean;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const { draft, clear } = useDraft();
  const [destinationId, setDestinationId] = useState(initial.destinationId ?? "");
  const [startDate, setStartDate] = useState(initial.startDate ?? addDays(todayISO(), 30));
  const [endDate, setEndDate] = useState(initial.endDate ?? addDays(todayISO(), 34));
  const [travelers, setTravelers] = useState(initial.travelersCount ?? 2);
  const [pace, setPace] = useState<TripPace>(initial.pace ?? "bilanciato");
  // Il nome resta "suggerito" (derivato da meta e data) finché l'utente non lo scrive
  const [customName, setCustomName] = useState<string | null>(initial.name ?? null);
  const [names, setNames] = useState<string[]>([]);
  const [budget, setBudget] = useState(initial.budgetPerPerson ? String(initial.budgetPerPerson) : "");
  const [origin, setOrigin] = useState(initial.originCode ?? "");

  const selection = useDraftSelection ? draft : null;

  const destLabel = destinations.find((d) => d.value === destinationId)?.label.split(",")[0];
  const suggestedName = useMemo(() => (destLabel && startDate ? `${destLabel} ${monthName(parseISODate(startDate).getUTCMonth() + 1).toLowerCase()} ${startDate.slice(0, 4)}` : ""), [destLabel, startDate]);
  const name = customName ?? suggestedName;

  const nights = startDate && endDate ? diffDays(startDate, endDate) : 0;
  const selectionMatches = selection && selection.search.to === destinationId;
  const errors = state.errors ?? {};

  return (
    <form action={(fd) => { if (selectionMatches) clear(); return formAction(fd); }} className="space-y-6" noValidate>
      {state.message && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {state.message}
        </p>
      )}

      <Field label="Dove vai?" htmlFor="destinationId" error={errors.destinationId}>
        <Select id="destinationId" name="destinationId" value={destinationId} onChange={(e) => setDestinationId(e.target.value)} required aria-invalid={!!errors.destinationId}>
          <option value="" disabled>
            Scegli una destinazione
          </option>
          {destinations.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Nome del viaggio" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" value={name} onChange={(e) => setCustomName(e.target.value)} placeholder="Es. Spagna con gli amici 2027" maxLength={80} aria-invalid={!!errors.name} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Partenza" htmlFor="startDate" error={errors.startDate}>
          <Input id="startDate" name="startDate" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate <= e.target.value) setEndDate(addDays(e.target.value, 3)); }} aria-invalid={!!errors.startDate} />
        </Field>
        <Field label="Ritorno" htmlFor="endDate" error={errors.endDate} hint={nights > 0 ? `${nights} notti, ${nights + 1} giorni` : undefined}>
          <Input id="endDate" name="endDate" type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-invalid={!!errors.endDate} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Parti da" htmlFor="originCode" error={errors.originCode}>
          <Select id="originCode" name="originCode" value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">Non so ancora</option>
            {origins.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Viaggiatori" htmlFor="travelersCount" error={errors.travelersCount}>
          <div className="flex h-11 items-center justify-between rounded-xl border border-line bg-surface px-1.5">
            <button type="button" className="press flex h-8 w-8 items-center justify-center rounded-lg hoverable:hover:bg-ink/5 disabled:opacity-40" disabled={travelers <= 1} onClick={() => setTravelers((t) => t - 1)} aria-label="Meno viaggiatori">
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-semibold tabular-nums">{travelers}</span>
            <button type="button" className="press flex h-8 w-8 items-center justify-center rounded-lg hoverable:hover:bg-ink/5 disabled:opacity-40" disabled={travelers >= 12} onClick={() => setTravelers((t) => t + 1)} aria-label="Più viaggiatori">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input type="hidden" name="travelersCount" value={travelers} />
        </Field>
        <Field label="Budget a persona" htmlFor="budgetPerPerson" error={errors.budgetPerPerson} hint="Opzionale, in euro">
          <Input id="budgetPerPerson" name="budgetPerPerson" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="Es. 800" />
        </Field>
      </div>

      {travelers > 1 && (
        <details className="rounded-2xl border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold">Chi viene con te? (opzionale)</summary>
          <div className="mt-3 space-y-2">
            {Array.from({ length: travelers - 1 }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input name="travelerNames" placeholder={`Viaggiatore ${i + 2}`} value={names[i] ?? ""} onChange={(e) => setNames((n) => Object.assign([...n], { [i]: e.target.value }))} maxLength={60} />
              </div>
            ))}
          </div>
        </details>
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-soft">Ritmo del viaggio</legend>
        <div className="grid grid-cols-3 gap-2">
          {PACES.map((p) => (
            <label key={p.key} className={cn("press cursor-pointer rounded-2xl border p-3 text-center transition-colors duration-150", pace === p.key ? "border-brand-500 bg-brand-50" : "border-line bg-surface")}>
              <input type="radio" name="pace" value={p.key} checked={pace === p.key} onChange={() => setPace(p.key)} className="sr-only" />
              <span className="block text-sm font-semibold">{p.label}</span>
              <span className="block text-xs text-muted">{p.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {selectionMatches && (selection.outbound || selection.inbound || selection.stay) && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Dalla tua ricerca</p>
            <button type="button" onClick={clear} className="flex items-center gap-1 text-xs font-semibold text-muted">
              <X className="h-3.5 w-3.5" /> Rimuovi
            </button>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {selection.outbound && (
              <li className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-brand-600" /> Andata {selection.outbound.airline} · {formatPrice(selection.outbound.price)} a persona
                <input type="hidden" name="outboundOfferId" value={selection.outbound.id} />
              </li>
            )}
            {selection.inbound && (
              <li className="flex items-center gap-2">
                <Plane className="h-4 w-4 -scale-x-100 text-brand-600" /> Ritorno {selection.inbound.airline} · {formatPrice(selection.inbound.price)} a persona
                <input type="hidden" name="returnOfferId" value={selection.inbound.id} />
              </li>
            )}
            {selection.stay && (
              <li className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-brand-600" /> {selection.stay.name} · {formatPrice(selection.stay.priceTotal)} totale
                <input type="hidden" name="accommodationOfferId" value={selection.stay.id} />
              </li>
            )}
          </ul>
          <p className="mt-2 text-xs text-muted">I prezzi vengono riverificati al salvataggio.</p>
        </div>
      )}

      <Button type="submit" size="lg" variant="secondary" className="w-full sm:w-auto" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

/** Precompila dalla bozza della ricerca: rimonta il form quando la bozza è disponibile sul client. */
export function DraftTripForm(props: Omit<Parameters<typeof TripForm>[0], "useDraftSelection">) {
  const { draft } = useDraft();
  const s = draft?.search;
  const initial: TripFormValues = s
    ? { ...props.initial, destinationId: s.to ?? props.initial?.destinationId, startDate: s.depart, endDate: s.ret, travelersCount: s.travelers, budgetPerPerson: s.budget ?? null, originCode: s.from ?? props.initial?.originCode }
    : props.initial ?? {};
  return <TripForm key={s ? `${s.to}-${s.depart}-${s.ret}` : "vuoto"} {...props} initial={initial} useDraftSelection />;
}
