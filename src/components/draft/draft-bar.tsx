"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { draftTotal, useDraft } from "./draft-provider";
import { cn, formatPrice } from "@/lib/format";

/** Barra "Il tuo viaggio": riepilogo istantaneo delle selezioni e confronto con il budget. */
export function DraftBar() {
  const { draft, clear } = useDraft();
  const { perPerson, items } = draftTotal(draft);
  if (!draft || items === 0) return null;
  const budget = draft.search.budget;
  const over = budget ? perPerson > budget : false;
  const parts = [draft.outbound && "andata", draft.inbound && "ritorno", draft.stay && "alloggio"].filter(Boolean);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.6rem] z-30 px-3 md:bottom-5">
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-[1.5rem] bg-ink p-2.5 pl-5 text-white shadow-[var(--shadow-float)] transition-transform duration-300 ease-[var(--ease-out)] starting:translate-y-6 starting:opacity-0">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-white/70">Il tuo viaggio{draft.destinationName ? ` a ${draft.destinationName}` : ""} · {parts.join(" + ")}</p>
          <p className="font-display text-lg font-bold leading-tight">
            {formatPrice(perPerson)} <span className="text-sm font-medium text-white/70">a persona</span>
            {budget && <span className={cn("ml-2 text-xs font-semibold", over ? "text-rose-300" : "text-emerald-300")}>{over ? `+${formatPrice(perPerson - budget)} oltre il budget` : `${formatPrice(budget - perPerson)} sotto budget`}</span>}
          </p>
        </div>
        <button onClick={clear} className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 hoverable:hover:bg-white/10" aria-label="Svuota la bozza">
          <X className="h-4 w-4" />
        </button>
        <Link href="/viaggi/nuovo?bozza=1" className="press flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-sun-400 px-4 text-sm font-bold text-ink">
          Crea viaggio <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
