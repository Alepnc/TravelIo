"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { SearchOption } from "@/components/search/search-widget";
import { cn } from "@/lib/format";

const INTERESTS = [
  ["cultura", "🏛️ Cultura"], ["arte", "🎨 Arte"], ["storia", "📜 Storia"], ["natura", "🌿 Natura"], ["mare", "🏖️ Mare"],
  ["nightlife", "🎉 Nightlife"], ["cibo", "🍝 Cibo"], ["panorama", "🌅 Panorami"], ["shopping", "🛍️ Shopping"], ["relax", "🧘 Relax"], ["avventura", "🧗 Avventura"],
] as const;

export function ProfileForm({ initial, origins }: { initial: { name: string; email: string; homeAirport: string; pace: string; budgetLevel: string; interests: string[] }; origins: SearchOption[] }) {
  const [state, action, pending] = useActionState(updateProfileAction, {});
  return (
    <form action={action} className="space-y-6">
      {state.message && (
        <p role="status" className={cn("rounded-xl px-3.5 py-2.5 text-sm", state.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="name" error={state.errors?.name}>
          <Input id="name" name="name" defaultValue={initial.name} required />
        </Field>
        <Field label="Email" htmlFor="email" hint="Non modificabile">
          <Input id="email" value={initial.email} disabled />
        </Field>
      </div>
      <Field label="Aeroporto di partenza preferito" htmlFor="homeAirport" hint="Usato per prezzi e suggerimenti">
        <Select id="homeAirport" name="homeAirport" defaultValue={initial.homeAirport}>
          <option value="">Nessuno</option>
          {origins.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ritmo preferito" htmlFor="pace">
          <Select id="pace" name="pace" defaultValue={initial.pace}>
            <option value="rilassato">Rilassato</option>
            <option value="bilanciato">Bilanciato</option>
            <option value="intenso">Intenso</option>
          </Select>
        </Field>
        <Field label="Livello di spesa" htmlFor="budgetLevel">
          <Select id="budgetLevel" name="budgetLevel" defaultValue={initial.budgetLevel}>
            <option value="basso">Risparmio al massimo</option>
            <option value="medio">Equilibrato</option>
            <option value="alto">Mi concedo qualcosa</option>
          </Select>
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-soft">Cosa ti piace fare in viaggio?</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(([key, label]) => (
            <label key={key} className="cursor-pointer">
              <input type="checkbox" name="interests" value={key} defaultChecked={initial.interests.includes(key)} className="peer sr-only" />
              <span className="press inline-block rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium transition-colors duration-150 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-800 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
                {label}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">L&apos;itinerario darà priorità alle attività che corrispondono ai tuoi interessi.</p>
      </fieldset>
      <Button type="submit" loading={pending}>
        Salva preferenze
      </Button>
    </form>
  );
}
