"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { TripDetail, TripExpense } from "@/lib/dto";
import { computeBudget } from "@/lib/budget";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { Field, Input, Select } from "@/components/ui/field";
import { cn, formatPrice } from "@/lib/format";
import { formatDate, todayISO } from "@/lib/time";
import { BudgetBar, BudgetLines, BudgetStatus } from "./budget-summary";

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" | "success" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-extrabold tabular-nums sm:text-3xl", tone === "danger" && "text-danger")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

/** Barre orizzontali previsto vs speso per categoria: un solo tono, identità data dall'etichetta. */
function CategoryBars({ budget }: { budget: ReturnType<typeof computeBudget> }) {
  const max = Math.max(1, ...budget.lines.map((l) => Math.max(l.estimated, l.actual)));
  return (
    <figure>
      <div className="mb-3 flex gap-4 text-xs text-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-brand-300" /> Previsto</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-sm bg-ink" /> Speso</span>
      </div>
      <ul className="space-y-3.5">
        {budget.lines.map((l) => (
          <li key={l.category} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-sm" title={`${l.label}: previsto ${formatPrice(l.estimated)}, speso ${formatPrice(l.actual)}`}>
            <span className="truncate text-ink-soft">
              <span aria-hidden>{l.emoji}</span> {l.label}
            </span>
            <span className="relative h-5">
              <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-brand-300 transition-[width] duration-500 ease-[var(--ease-out)]" style={{ width: `${(l.estimated / max) * 100}%` }} />
              {l.actual > 0 && <span className={cn("absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-r-[4px] ring-2 ring-surface transition-[width] duration-500", l.actual > l.estimated ? "bg-danger" : "bg-ink")} style={{ width: `${(l.actual / max) * 100}%` }} />}
            </span>
            <span className="text-right font-semibold tabular-nums">{formatPrice(l.estimated)}</span>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">Costi previsti e spese registrate per categoria. I valori completi sono nella tabella.</figcaption>
    </figure>
  );
}

export function BudgetTracker({ trip }: { trip: TripDetail }) {
  const [expenses, setExpenses] = useState<TripExpense[]>(trip.expenses);
  const budget = computeBudget({ ...trip, expenses });
  const [form, setForm] = useState({ category: "cibo" as ExpenseCategory, label: "", amount: "", spentAt: todayISO() });
  const [saving, setSaving] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount.replace(",", "."));
    if (!form.label.trim() || !(amount > 0)) return toast.error("Inserisci descrizione e importo");
    setSaving(true);
    const res = await fetch(`/api/trips/${trip.id}/expenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount }) });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error ?? "Impossibile salvare la spesa");
    setExpenses((x) => [...x, data.expense]);
    setForm((f) => ({ ...f, label: "", amount: "" }));
    toast.success("Spesa registrata");
  }

  async function removeExpense(x: TripExpense) {
    setExpenses((list) => list.filter((e) => e.id !== x.id));
    const res = await fetch(`/api/trips/${trip.id}/expenses/${x.id}`, { method: "DELETE" });
    if (!res.ok) {
      setExpenses((list) => [...list, x]);
      toast.error("Impossibile eliminare la spesa");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Budget previsto" value={budget.plannedTotal ? formatPrice(budget.plannedTotal) : "—"} hint={trip.budgetPerPerson ? `${formatPrice(trip.budgetPerPerson)} a persona` : "Non impostato"} />
        <Stat label="Costo stimato" value={formatPrice(budget.estimatedTotal)} hint={`${formatPrice(budget.perPerson)} a persona`} tone={budget.overBy > 0 ? "danger" : undefined} />
        <Stat label="Speso finora" value={formatPrice(budget.actualTotal)} hint={`${expenses.length} spese registrate`} />
        <Stat label="Media giornaliera" value={formatPrice(budget.dailyAverage)} hint={`${budget.days} giorni · ${formatPrice(Math.round(budget.dailyAverage / budget.travelers))} a testa`} />
      </div>

      <Card className="space-y-3 p-5">
        <BudgetStatus budget={budget} />
        <BudgetBar usage={budget.usage} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold">Per categoria</h2>
          <CategoryBars budget={budget} />
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-brand-600">Mostra tabella</summary>
            <div className="mt-3">
              <BudgetLines budget={budget} showActual />
            </div>
          </details>
          <p className="mt-4 text-xs text-muted">
            Il previsto deriva da voli, alloggio e attività dell&apos;itinerario (cibo e trasporti locali stimati sulle medie della destinazione quando mancano dati). Il totale usa, per ogni categoria, il valore più alto tra previsto e speso.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold">Spese effettive</h2>
          <form onSubmit={add} className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Descrizione" htmlFor="exp-label" className="col-span-2">
              <Input id="exp-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Es. Cena tapas" maxLength={80} />
            </Field>
            <Field label="Categoria" htmlFor="exp-cat">
              <Select id="exp-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Importo totale (€)" htmlFor="exp-amount">
              <Input id="exp-amount" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.,]/g, "") })} placeholder="0" />
            </Field>
            <Field label="Data" htmlFor="exp-date">
              <Input id="exp-date" type="date" value={form.spentAt} onChange={(e) => setForm({ ...form, spentAt: e.target.value })} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full" loading={saving} icon={<Plus className="h-4 w-4" />}>
                Aggiungi
              </Button>
            </div>
          </form>
          {expenses.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">Registra qui quello che spendi durante il viaggio: vedrai subito se sei in linea con il previsto.</p>
          ) : (
            <ul className="mt-5 divide-y divide-line">
              {[...expenses].reverse().map((x) => {
                const cat = EXPENSE_CATEGORIES.find((c) => c.key === x.category)!;
                return (
                  <li key={x.id} className="flex items-center gap-3 py-2.5">
                    <span className="text-lg" aria-hidden>{cat.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{x.label}</p>
                      <p className="text-xs text-muted">
                        {cat.label}
                        {x.spentAt ? ` · ${formatDate(x.spentAt)}` : ""}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{formatPrice(x.amount)}</span>
                    <button onClick={() => removeExpense(x)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hoverable:hover:bg-danger/10 hoverable:hover:text-danger" aria-label={`Elimina ${x.label}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
