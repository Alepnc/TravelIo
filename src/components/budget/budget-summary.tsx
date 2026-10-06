import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { BudgetSummary } from "@/lib/budget";
import { cn, formatPrice } from "@/lib/format";

export function BudgetBar({ usage }: { usage: number | null }) {
  if (usage == null) return null;
  const pct = Math.min(100, Math.round(usage * 100));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-ink/5" role="progressbar" aria-valuenow={Math.round(usage * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Budget utilizzato">
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out)]", usage > 1 ? "bg-danger" : usage > 0.85 ? "bg-warning" : "bg-success")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BudgetStatus({ budget }: { budget: BudgetSummary }) {
  if (!budget.plannedTotal) return <p className="text-sm text-muted">Imposta un budget a persona per sapere quando stai esagerando.</p>;
  if (budget.overBy > 0)
    return (
      <p className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger" role="status">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Stai superando il budget di {formatPrice(budget.overBy)} ({formatPrice(Math.ceil(budget.overBy / budget.travelers))} a persona)
      </p>
    );
  return (
    <p className="flex items-start gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success" role="status">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Ti restano {formatPrice(budget.plannedTotal - budget.estimatedTotal)} di margine
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
          <tr key={l.category} className="border-b border-line/70 last:border-0">
            <td className="py-2.5">
              <span className="mr-2" aria-hidden>{l.emoji}</span>
              {l.label}
              {l.isRough && l.estimated > 0 && <span className="ml-1.5 text-xs text-muted">(stima media)</span>}
            </td>
            <td className="py-2.5 text-right font-semibold tabular-nums">{formatPrice(l.estimated)}</td>
            {showActual && <td className={cn("w-24 py-2.5 text-right tabular-nums", l.actual > l.estimated ? "font-semibold text-danger" : "text-muted")}>{formatPrice(l.actual)}</td>}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-ink">
          <td className="pt-3 font-bold">Totale</td>
          <td className="pt-3 text-right font-display text-lg font-extrabold tabular-nums">{formatPrice(budget.estimatedTotal)}</td>
          {showActual && <td className="pt-3 text-right font-semibold tabular-nums">{formatPrice(budget.actualTotal)}</td>}
        </tr>
      </tfoot>
    </table>
  );
}
