import { Warning as AlertTriangle, CheckCircle as CheckCircle2, Siren } from "@phosphor-icons/react/dist/ssr";
import type { BudgetSummary } from "@/lib/budget";
import { EXPENSE_ICON } from "@/components/ui/category-icons";
import { cn, formatPrice } from "@/lib/format";

/** Tre livelli, come un tabellone: in orario, attenzione (oltre l'85%), sforato. */
export type BudgetLevel = "none" | "calm" | "warn" | "over";
export function budgetLevel(usage: number | null): BudgetLevel {
  if (usage == null) return "none";
  return usage > 1 ? "over" : usage > 0.85 ? "warn" : "calm";
}

export function BudgetBar({ usage }: { usage: number | null }) {
  if (usage == null) return null;
  const pct = Math.min(100, Math.round(usage * 100));
  return (
    <div className="h-2 overflow-hidden rounded-xs bg-current/15" role="progressbar" aria-valuenow={Math.round(usage * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Budget utilizzato">
      <div className={cn("h-full transition-[width] duration-500 ease-[var(--ease-out)]", usage > 1 ? "bg-danger" : usage > 0.85 ? "bg-brand-500" : "bg-current")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BudgetStatus({ budget }: { budget: BudgetSummary }) {
  if (!budget.plannedTotal) return <p className="text-sm opacity-75">Imposta un budget a persona per sapere quando stai esagerando.</p>;
  const level = budgetLevel(budget.usage);
  if (level === "over")
    return (
      <p className="flex items-start gap-2 rounded-sm bg-danger px-3 py-2.5 text-sm font-semibold text-white" role="status">
        <Siren className="mt-0.5 h-4 w-4 shrink-0" weight="fill" /> Budget sforato di {formatPrice(budget.overBy)} ({formatPrice(Math.ceil(budget.overBy / budget.travelers))} a persona)
      </p>
    );
  if (level === "warn")
    return (
      <p className="flex items-start gap-2 rounded-sm bg-brand-500 px-3 py-2.5 text-sm font-semibold text-ink" role="status">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" /> Attenzione: restano solo {formatPrice(budget.plannedTotal - budget.estimatedTotal)} di margine
      </p>
    );
  return (
    <p className="flex items-start gap-2 text-sm font-medium" role="status">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" weight="fill" /> Ti restano {formatPrice(budget.plannedTotal - budget.estimatedTotal)} di margine
    </p>
  );
}

export function BudgetLines({ budget, showActual = false }: { budget: BudgetSummary; showActual?: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead className="sr-only">
        <tr>
          <th>Categoria</th>
          <th>Previsto</th>
          {showActual && <th>Speso</th>}
        </tr>
      </thead>
      <tbody>
        {budget.lines.map((l) => (
          <tr key={l.category} className="border-b border-current/10 last:border-0">
            <td className="py-2.5">
              <LineIcon category={l.category} />
              {l.label}
              {l.isRough && l.estimated > 0 && <span className="ml-1.5 text-xs opacity-65">(stima media)</span>}
            </td>
            <td className="py-2.5 text-right font-semibold tabular-nums">{formatPrice(l.estimated)}</td>
            {showActual && <td className={cn("w-24 py-2.5 text-right tabular-nums", l.actual > l.estimated ? "font-semibold text-danger" : "opacity-70")}>{formatPrice(l.actual)}</td>}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-current">
          <td className="pt-3 font-bold">Totale</td>
          <td className="pt-3 text-right text-lg font-bold tabular-nums [font-stretch:85%]">{formatPrice(budget.estimatedTotal)}</td>
          {showActual && <td className="pt-3 text-right font-semibold tabular-nums">{formatPrice(budget.actualTotal)}</td>}
        </tr>
      </tfoot>
    </table>
  );
}

function LineIcon({ category }: { category: string }) {
  const Icon = EXPENSE_ICON[category as keyof typeof EXPENSE_ICON];
  return Icon ? <Icon className="-mt-0.5 mr-2 inline h-4 w-4 opacity-70" aria-hidden /> : null;
}
