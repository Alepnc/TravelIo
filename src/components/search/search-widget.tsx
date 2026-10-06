"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CalendarDots as CalendarDays, MapPin, Minus, AirplaneTakeoff as PlaneTakeoff, Plus, MagnifyingGlass as Search, Users, Wallet } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/format";
import { addDays, monthName, todayISO } from "@/lib/time";

export interface SearchOption {
  value: string;
  label: string;
}

export interface SearchDefaults {
  from?: string;
  to?: string;
  depart?: string;
  ret?: string;
  month?: number;
  travelers?: number;
  budget?: number;
}

// Ogni campo è una cella del tabellone: etichetta di colonna sopra, valore in bianco sotto.
const fieldBox = "group relative flex min-w-0 flex-col justify-center gap-1 bg-board-cell px-3.5 py-2.5 transition-colors duration-150 focus-within:bg-board-frame hoverable:hover:bg-board-frame/70 focus-within:shadow-[inset_0_-3px_0_var(--color-brand-500)]";
const labelCls = "col-label flex items-center gap-1.5 text-board-dim";
const control = "w-full min-w-0 truncate bg-transparent text-base font-semibold text-board-text [color-scheme:dark] outline-none placeholder:font-medium placeholder:text-board-dim [&>option]:bg-board [&>option]:text-board-text";

export function SearchWidget({ origins, destinations, defaults = {}, compact = false }: { origins: SearchOption[]; destinations: SearchOption[]; defaults?: SearchDefaults; compact?: boolean }) {
  const router = useRouter();
  const [from, setFrom] = useState(defaults.from ?? "NAP");
  const [to, setTo] = useState(defaults.to ?? "");
  const [flexible, setFlexible] = useState(!defaults.depart && !!defaults.month);
  const [depart, setDepart] = useState(defaults.depart ?? "");
  const [ret, setRet] = useState(defaults.ret ?? "");
  const [month, setMonth] = useState(defaults.month ?? (new Date().getMonth() + 1) % 12 + 1);
  const [travelers, setTravelers] = useState(defaults.travelers ?? 2);
  const [budget, setBudget] = useState(defaults.budget ? String(defaults.budget) : "");
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!flexible && depart && ret && ret <= depart) {
      setError("La data di ritorno deve essere dopo la partenza");
      return;
    }
    if (!flexible && depart && depart < today) {
      setError("La partenza non può essere nel passato");
      return;
    }
    setError(null);
    const params = new URLSearchParams({ from, travelers: String(travelers) });
    if (to) params.set("to", to);
    if (flexible) params.set("month", String(month));
    else {
      if (depart) params.set("depart", depart);
      if (ret) params.set("ret", ret);
    }
    if (budget) params.set("budget", budget);
    router.push(`/cerca?${params}`);
  }

  return (
    <form onSubmit={submit} className={cn("overflow-hidden rounded-md bg-board-frame p-px", compact && "rounded-sm")} aria-label="Cerca un viaggio">
      <div className="grid grid-cols-2 gap-px lg:grid-cols-[1fr_1.15fr_2fr_0.75fr_0.8fr_auto] lg:items-stretch">
        <label className={cn(fieldBox, "col-span-1")}>
          <span className={labelCls}>
            <PlaneTakeoff className="h-3.5 w-3.5" /> Da dove parti?
          </span>
          <select className={cn(control, "appearance-none")} value={from} onChange={(e) => setFrom(e.target.value)} name="from">
            {origins.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={cn(fieldBox, "col-span-1")}>
          <span className={labelCls}>
            <MapPin className="h-3.5 w-3.5" /> Dove vuoi andare?
          </span>
          <select className={cn(control, "appearance-none")} value={to} onChange={(e) => setTo(e.target.value)} name="to">
            <option value="">Ovunque</option>
            {destinations.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <div className={cn(fieldBox, "col-span-2 lg:col-span-1")}>
          <div className="flex items-center justify-between gap-2">
            <span className={labelCls}>
              <CalendarDays className="h-3.5 w-3.5" /> Quando?
            </span>
            <button type="button" onClick={() => setFlexible(!flexible)} className="rounded-sm border border-board-dim/40 px-1.5 py-0.5 text-[11px] font-semibold text-board-text hoverable:hover:border-brand-500 hoverable:hover:text-brand-500" aria-pressed={flexible}>
              {flexible ? "Date precise" : "Sono flessibile"}
            </button>
          </div>
          {flexible ? (
            <select className={cn(control, "appearance-none")} value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Mese">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {monthName(i + 1)}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="Partenza" className={control} min={today} value={depart} onChange={(e) => { setDepart(e.target.value); if (!ret || ret <= e.target.value) setRet(addDays(e.target.value, 4)); }} />
              <span className="text-board-dim" aria-hidden>→</span>
              <input type="date" aria-label="Ritorno" className={control} min={depart || today} value={ret} onChange={(e) => setRet(e.target.value)} />
            </div>
          )}
        </div>

        <div className={cn(fieldBox, "col-span-1")}>
          <span className={labelCls}>
            <Users className="h-3.5 w-3.5" /> Viaggiatori
          </span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Meno viaggiatori" disabled={travelers <= 1} onClick={() => setTravelers((t) => Math.max(1, t - 1))} className="press flex h-7 w-7 items-center justify-center rounded-sm border border-board-dim/40 text-board-text disabled:opacity-35 hoverable:hover:border-brand-500">
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-5 text-center text-base font-semibold text-board-text tabular-nums" aria-live="polite">{travelers}</span>
            <button type="button" aria-label="Più viaggiatori" disabled={travelers >= 12} onClick={() => setTravelers((t) => Math.min(12, t + 1))} className="press flex h-7 w-7 items-center justify-center rounded-sm border border-board-dim/40 text-board-text disabled:opacity-35 hoverable:hover:border-brand-500">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <label className={cn(fieldBox, "col-span-1")}>
          <span className={labelCls}>
            <Wallet className="h-3.5 w-3.5" /> Budget a testa
          </span>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-board-dim">€</span>
            <input inputMode="numeric" pattern="[0-9]*" placeholder="Opzionale" className={control} value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, "").slice(0, 5))} />
          </div>
        </label>

        <div className="col-span-2 bg-board-cell p-1.5 lg:col-span-1">
          <Button type="submit" variant="secondary" size="lg" className="h-full min-h-13 w-full rounded-sm px-7" icon={<Search className="h-5 w-5" weight="bold" />}>
            Cerca
          </Button>
        </div>
      </div>
      {error && (
        <p className="bg-danger px-4 py-2 text-sm font-semibold text-white" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
