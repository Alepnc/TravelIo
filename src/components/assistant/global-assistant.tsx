"use client";

import { useState } from "react";
import { Sparkle as Sparkles } from "@phosphor-icons/react/dist/ssr";
import { AssistantPanel } from "./assistant-panel";

/** "Organizzami 5 giorni a Parigi con 600 €": l'assistente crea la bozza del viaggio. */
export function PlanWithAssistant() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="press flex h-11 items-center gap-2 rounded-md border border-ink/25 bg-surface px-4 text-sm font-semibold text-ink hoverable:hover:border-ink">
        <Sparkles className="h-4 w-4" /> Pianifica con l&apos;assistente
      </button>
      <AssistantPanel open={open} onClose={() => setOpen(false)} tripId={null} />
    </>
  );
}
