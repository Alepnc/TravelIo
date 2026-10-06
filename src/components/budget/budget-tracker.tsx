"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Trash as Trash2 } from "@phosphor-icons/react/dist/ssr";
import type { TripDetail, TripExpense } from "@/lib/dto";
import { computeBudget } from "@/lib/budget";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FlapText } from "@/components/ui/flap";
import { EXPENSE_ICON } from "@/components/ui/category-icons";
import { Field, Input, Select } from "@/components/ui/field";
import { cn, formatPrice } from "@/lib/format";
import { formatDate, todayISO } from "@/lib/time";
import { BudgetBar, BudgetLines, BudgetStatus, budgetLevel } from "./budget-summary";

/** Una colonna del registro sul tabellone: etichetta, cifra a palette, nota. */
function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" | "warn" }) {
  return (
    <div className="bg-board px-4 py-4 sm:px-5">
      <p className="col-label text-board-dim">{label}</p>
      <FlapText text={value.replace("\u00a0", "")} className="mt-2 text-xl sm:text-2xl" cellClassName={tone === "danger" ? "!text-[#ff6b6b]" : tone === "warn" ? "!text-brand-500" : undefined} />
      {hint && <p className="mt-1.5 text-xs text-board-dim">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-ink pt-4">
      <h2 className="mb-4 text-xl font-bold [font-stretch:82%]">{title}</h2>
      {children}
    </section>
  );
}

/** Barre orizzontali previsto vs speso per categoria: un solo tono, identità data dall'etichetta. */
function CategoryBars({ budget }: { budget: ReturnType<typeof computeBudget> }) {
  const max = Math.max(1, ...budget.lines.map((l) => Math.max(l.estimated, l.actual)));
  return (
    <figure>
      <div className="mb-3 flex gap-4 text-xs text-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-xs bg-steel" /> Previsto</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-sm bg-ink" /> Speso</span>
      </div>
      <ul className="space-y-3.5">
        {budget.lines.map((l) => (
          <li key={l.category} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-sm" title={`${l.label}: previsto ${formatPrice(l.estimated)}, speso ${formatPrice(l.actual)}`}>
            <span className="flex items-center gap-1.5 truncate text-ink-soft">
              <ExpenseIcon category={l.category} /> {l.label}
            </span>
            <span className="relative h-5">
              <span className="absolute inset-y-0 left-0 rounded-r-[2px] bg-steel transition-[width] duration-500 ease-[var(--ease-out)]" style={{ width: `${(l.estimated / max) * 100}%` }} />
              {l.actual > 0 && <span className={cn("absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-r-[2px] ring-2 ring-canvas transition-[width] duration-500", l.actual > l.estimated ? "bg-danger" : "bg-ink")} style={{ width: `${(l.actual / max) * 100}%` }} />}
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
  const level = budgetLevel(budget.usage);
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
      <div className="board-panel grid grid-cols-2 gap-px overflow-hidden !bg-board-frame lg:grid-cols-4">
        <Stat label="Budget previsto" value={budget.plannedTotal ? formatPrice(budget.plannedTotal) : "Nessuno"} hint={trip.budgetPerPerson ? `${formatPrice(trip.budgetPerPerson)} a persona` : "Non impostato"} />
        <Stat label="Costo stimato" value={formatPrice(budget.estimatedTotal)} hint={`${formatPrice(budget.perPerson)} a persona`} tone={level === "over" ? "danger" : level === "warn" ? "warn" : undefined} />
        <Stat label="Speso finora" value={formatPrice(budget.actualTotal)} hint={`${expenses.length} spese registrate`} />
        <Stat label="Media giornaliera" value={formatPrice(budget.dailyAverage)} hint={`${budget.days} giorni · ${formatPrice(Math.round(budget.dailyAverage / budget.travelers))} a testa`} />
      </div>

      <div className="space-y-3">
        <BudgetStatus budget={budget} />
        <BudgetBar usage={budget.usage} />
      </div>

      <div className="grid gap-10 pt-4 lg:grid-cols-2">
        <Panel title="Per categoria">
          <CategoryBars budget={budget} />
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold underline underline-offset-4">Mostra tabella</summary>
            <div className="mt-3">
              <BudgetLines budget={budget} showActual />
            </div>
          </details>
          <p className="mt-4 text-xs text-muted">
            Il previsto deriva da voli, alloggio e attività dell&apos;itinerario (cibo e trasporti locali stimati sulle medie della destinazione quando mancano dati). Il totale usa, per ogni categoria, il valore più alto tra previsto e speso.
          </p>
        </Panel>

        <Panel title="Spese effettive">
          <form onSubmit={add} className="grid grid-cols-2 gap-3">
            <Field label="Descrizione" htmlFor="exp-label" className="col-span-2">
              <Input id="exp-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Es. Cena tapas" maxLength={80} />
            </Field>
            <Field label="Categoria" htmlFor="exp-cat">
              <Select id="exp-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
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
            <p className="mt-5 rounded-md border border-dashed border-ink/25 p-4 text-sm text-muted">Registra qui quello che spendi durante il viaggio: vedrai subito se sei in linea con il previsto.</p>
          ) : (
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {[...expenses].reverse().map((x) => {
                const cat = EXPENSE_CATEGORIES.find((c) => c.key === x.category)!;
                return (
                  <li key={x.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-ink/[0.06]"><ExpenseIcon category={cat.key} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{x.label}</p>
                      <p className="text-xs text-muted">
                        {cat.label}
                        {x.spentAt ? ` · ${formatDate(x.spentAt)}` : ""}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{formatPrice(x.amount)}</span>
                    <button onClick={() => removeExpense(x)} className="flex h-9 w-9 items-center justify-center rounded-md text-muted hoverable:hover:bg-danger/10 hoverable:hover:text-danger" aria-label={`Elimina ${x.label}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ExpenseIcon({ category }: { category: ExpenseCategory }) {
  const Icon = EXPENSE_ICON[category];
  return <Icon className="h-4 w-4 shrink-0" aria-hidden />;
}
