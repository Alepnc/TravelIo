import type { ReactNode } from "react";
import { AlertTriangle, Compass } from "lucide-react";
import { cn } from "@/lib/format";

export function Badge({ children, className, tone = "neutral" }: { children: ReactNode; className?: string; tone?: "neutral" | "brand" | "sun" | "success" | "danger" }) {
  const tones = {
    neutral: "bg-ink/5 text-ink-soft",
    brand: "bg-brand-50 text-brand-700",
    sun: "bg-sun-100 text-ink",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line/70 bg-surface shadow-[var(--shadow-card)]", className)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center", className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon ?? <Compass className="h-6 w-6" />}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Qualcosa è andato storto", description, action, className }: { title?: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-danger/20 bg-danger/5 px-6 py-10 text-center", className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DemoDataBadge({ className }: { className?: string }) {
  return (
    <span title="Prezzi, orari e strutture sono generati per la demo: nessuna API reale è collegata." className={cn("inline-flex items-center gap-1.5 rounded-full border border-sun-400/60 bg-sun-100 px-2.5 py-1 text-xs font-medium text-ink", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-sun-500" aria-hidden />
      Dati dimostrativi
    </span>
  );
}

export function LiveDataBadge({ className }: { className?: string }) {
  return (
    <span title="Prezzi rilevati da Google Flights e Google Hotels. Il prezzo finale è quello del sito del venditore." className={cn("inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-ink", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
      Prezzi reali
    </span>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1.5 text-sm font-semibold text-brand-600">{eyebrow}</p>}
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {description && <p className="mt-1.5 max-w-xl text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
