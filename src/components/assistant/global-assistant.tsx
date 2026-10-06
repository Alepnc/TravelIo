"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AssistantPanel } from "./assistant-panel";

/** "Organizzami 5 giorni a Parigi con 600 €": l'assistente crea la bozza del viaggio. */
export function PlanWithAssistant() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="press flex h-11 items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-700 hoverable:hover:bg-brand-100">
        <Sparkles className="h-4 w-4" /> Pianifica con l&apos;assistente
      </button>
      <AssistantPanel open={open} onClose={() => setOpen(false)} tripId={null} />
    </>
  );
}
