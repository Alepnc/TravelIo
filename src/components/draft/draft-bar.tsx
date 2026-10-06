"use client";

import Link from "next/link";
import { ArrowRight, X } from "@phosphor-icons/react/dist/ssr";
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
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-md border border-board-frame bg-board p-2 pl-4 text-board-text shadow-[var(--shadow-float)] transition-transform duration-300 ease-[var(--ease-out)] starting:translate-y-6 starting:opacity-0">
        <div className="min-w-0 flex-1">
          <p className="col-label truncate text-board-dim">Il tuo viaggio{draft.destinationName ? ` a ${draft.destinationName}` : ""} · {parts.join(" + ")}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-lg font-bold leading-tight">
            <span className="tabular [font-stretch:85%]">{formatPrice(perPerson)}</span> <span className="text-sm font-medium text-board-dim">a persona</span>
            {budget && (
              <span className={cn("flap rounded-xs px-1.5 py-0.5 text-[11px]", over ? "bg-danger text-white" : "bg-board-cell text-board-text")}>
                {over ? `+${formatPrice(perPerson - budget)} oltre il budget` : `${formatPrice(budget - perPerson)} sotto budget`}
              </span>
            )}
          </p>
        </div>
        <button onClick={clear} className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-board-dim hoverable:hover:bg-white/10 hoverable:hover:text-board-text" aria-label="Svuota la bozza">
          <X className="h-4 w-4" />
        </button>
        <Link href="/viaggi/nuovo?bozza=1" className="press flex h-11 shrink-0 items-center gap-1.5 rounded-sm bg-brand-500 px-4 text-sm font-bold text-ink hoverable:hover:bg-brand-300">
          Crea viaggio <ArrowRight className="h-4 w-4" weight="bold" />
        </Link>
      </div>
    </div>
  );
}
