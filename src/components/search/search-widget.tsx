"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CalendarDays, MapPin, Minus, PlaneTakeoff, Plus, Search, Users, Wallet } from "lucide-react";
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

const fieldBox = "group relative flex min-w-0 flex-col justify-center rounded-2xl px-4 py-2.5 transition-colors duration-150 focus-within:bg-brand-50/70 hoverable:hover:bg-ink/[0.03]";
const labelCls = "flex items-center gap-1.5 text-xs font-semibold text-muted";
const control = "w-full min-w-0 truncate bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted/70";

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
    <form onSubmit={submit} className={cn("rounded-[1.75rem] border border-line bg-surface p-2 shadow-[var(--shadow-float)]", compact && "shadow-[var(--shadow-card)]")} aria-label="Cerca un viaggio">
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-[1fr_1.15fr_2fr_0.75fr_0.8fr_auto] lg:items-stretch">
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
            <option value="">✨ Qualsiasi destinazione</option>
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
            <button type="button" onClick={() => setFlexible(!flexible)} className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-semibold text-ink-soft hoverable:hover:bg-ink/10" aria-pressed={flexible}>
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
              <span className="text-muted">→</span>
              <input type="date" aria-label="Ritorno" className={control} min={depart || today} value={ret} onChange={(e) => setRet(e.target.value)} />
            </div>
          )}
        </div>

        <div className={cn(fieldBox, "col-span-1")}>
          <span className={labelCls}>
            <Users className="h-3.5 w-3.5" /> Viaggiatori
          </span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Meno viaggiatori" disabled={travelers <= 1} onClick={() => setTravelers((t) => Math.max(1, t - 1))} className="press flex h-6 w-6 items-center justify-center rounded-full border border-line disabled:opacity-40">
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-5 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">{travelers}</span>
            <button type="button" aria-label="Più viaggiatori" disabled={travelers >= 12} onClick={() => setTravelers((t) => Math.min(12, t + 1))} className="press flex h-6 w-6 items-center justify-center rounded-full border border-line disabled:opacity-40">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <label className={cn(fieldBox, "col-span-1")}>
          <span className={labelCls}>
            <Wallet className="h-3.5 w-3.5" /> Budget a testa
          </span>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-muted">€</span>
            <input inputMode="numeric" pattern="[0-9]*" placeholder="Opzionale" className={control} value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, "").slice(0, 5))} />
          </div>
        </label>

        <div className="col-span-2 p-1 lg:col-span-1">
          <Button type="submit" variant="secondary" size="lg" className="h-full min-h-13 w-full" icon={<Search className="h-5 w-5" />}>
            Cerca viaggio
          </Button>
        </div>
      </div>
      {error && (
        <p className="px-4 pb-2 pt-1 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
