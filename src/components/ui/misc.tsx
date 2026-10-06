import type { ReactNode } from "react";
import { Warning, Compass } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/format";

/** Etichetta di stato: rettangolare come le scritte del tabellone, mai una pillola. */
export function Badge({ children, className, tone = "neutral" }: { children: ReactNode; className?: string; tone?: "neutral" | "brand" | "sun" | "success" | "danger" }) {
  const tones = {
    neutral: "bg-ink/[0.07] text-ink-soft",
    brand: "bg-brand-500 text-ink",
    sun: "bg-brand-100 text-brand-800",
    success: "border border-ink/30 text-ink",
    danger: "bg-danger/10 text-danger",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

/** Superficie di lavoro bianca sull'atrio. Una sola altezza: mai una Card dentro un'altra Card. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-md border border-line bg-surface", className)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Stato vuoto: la sezione si ripiega al suo contorno, con una sola azione per riempirla. */
export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-4 rounded-md border border-dashed border-ink/25 px-5 py-8 sm:flex-row sm:items-center sm:gap-5 sm:px-7", className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink text-brand-500">{icon ?? <Compass className="h-5 w-5" />}</div>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="mt-1 max-w-prose text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Qualcosa è andato storto", description, action, className }: { title?: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-4 rounded-md border border-danger/30 bg-surface px-5 py-6 sm:flex-row sm:items-center sm:px-7", className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-danger text-white">
        <Warning className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="mt-1 max-w-prose text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function DemoDataBadge({ className }: { className?: string }) {
  return (
    <span title="Prezzi, orari e strutture sono generati per la demo: nessuna API reale è collegata." className={cn("col-label inline-flex items-center gap-1.5 rounded-sm bg-brand-500 px-2 py-1 text-ink", className)}>
      Dati dimostrativi
    </span>
  );
}

export function LiveDataBadge({ className, onBoard }: { className?: string; onBoard?: boolean }) {
  return (
    <span title="Prezzi rilevati da Google Flights e Google Hotels. Il prezzo finale è quello del sito del venditore." className={cn("col-label inline-flex items-center gap-1.5 rounded-sm border px-2 py-1", onBoard ? "border-board-dim/50 text-board-text" : "border-ink/30 text-ink", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", onBoard ? "bg-board-text" : "bg-ink")} aria-hidden />
      Prezzi reali
    </span>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[76rem] px-4 sm:px-6", className)}>{children}</div>;
}

/** Intestazione di sezione: il titolo parla da solo, l'eventuale azione sta sulla stessa linea di base. */
export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-t border-ink pt-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold [font-stretch:80%] sm:text-[2rem] sm:leading-tight">{title}</h2>
        {description && <p className="mt-1.5 max-w-prose text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
