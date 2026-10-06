"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowUp, Check, Sparkle as Sparkles } from "@phosphor-icons/react/dist/ssr";
import type { AssistantProposal, AssistantReply } from "@/lib/assistant";
import type { Itinerary } from "@/lib/types";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/format";

interface Message {
  role: "user" | "assistant";
  content: string;
  proposals?: AssistantProposal[];
  applied?: string[];
  engine?: AssistantReply["engine"];
}

const PROMPTS_TRIP = ["Vorrei una giornata tranquilla", "Togli questa attività e trovami qualcosa di più economico", "Aggiungi un posto con vista al tramonto", "Cosa mi consigli per la sera?"];
const PROMPTS_GLOBAL = ["Organizzami 5 giorni a Parigi spendendo massimo 600 €", "Un weekend economico a Budapest per 4 amici", "4 giorni a Lisbona con 500 €"];

/**
 * Assistente contestuale: conosce il viaggio corrente e il giorno selezionato.
 * Le modifiche sono PROPOSTE: l'utente vede cosa cambia e decide se applicarle.
 */
export function AssistantPanel({ open, onClose, tripId, focusDayId, onItinerary }: { open: boolean; onClose: () => void; tripId: string | null; focusDayId?: string; onItinerary?: (it: Itinerary | null) => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(tripId ? `/api/trips/${tripId}/assistant` : "/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, focusDayId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "L'assistente non risponde");
      setMessages((m) => [...m, { role: "assistant", content: data.reply, proposals: data.proposals, engine: data.engine, applied: [] }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Si è verificato un errore. Riprova." }]);
    } finally {
      setLoading(false);
    }
  }

  async function apply(msgIndex: number, proposals: AssistantProposal[]) {
    const key = proposals.map((p) => p.id).join(",");
    setApplying(key);
    try {
      const res = await fetch(tripId ? `/api/trips/${tripId}/assistant/apply` : "/api/assistant/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: proposals.map((p) => p.operation) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossibile applicare la modifica");
      if (data.redirectTo) {
        onClose();
        router.push(data.redirectTo);
        return;
      }
      setMessages((m) => m.map((msg, i) => (i === msgIndex ? { ...msg, applied: [...(msg.applied ?? []), ...proposals.map((p) => p.id)] } : msg)));
      onItinerary?.(data.itinerary ?? null);
      toast.success(proposals.length > 1 ? "Modifiche applicate" : "Modifica applicata");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setApplying(null);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  const prompts = tripId ? PROMPTS_TRIP : PROMPTS_GLOBAL;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Assistente di viaggio"
      className="md:w-[460px]"
      footer={
        <form onSubmit={submit} className="flex items-end gap-2 pb-1">
          <label htmlFor="assistant-input" className="sr-only">
            Scrivi all&apos;assistente
          </label>
          <textarea
            id="assistant-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={tripId ? "Chiedi di modificare il viaggio…" : "Dove vuoi andare?"}
            maxLength={1000}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-ink/20 bg-surface px-3 py-2.5 outline-none focus:border-ink focus:ring-3 focus:ring-brand-500"
          />
          <button type="submit" disabled={!input.trim() || loading} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-500 text-ink disabled:opacity-40" aria-label="Invia">
            <ArrowUp className="h-5 w-5" weight="bold" />
          </button>
        </form>
      }
    >
      <div className="space-y-4 pb-2" aria-live="polite">
        {messages.length === 0 && (
          <div className="pt-2">
            <p className="text-sm text-muted">{tripId ? "Conosco il tuo itinerario, il giorno che stai guardando e il tuo budget. Ti propongo modifiche: decidi tu se applicarle." : "Dimmi dove, per quanto e con che budget: preparo io il viaggio."}</p>
            <div className="mt-4 flex flex-col gap-2">
              {prompts.map((p) => (
                <button key={p} onClick={() => send(p)} className="press rounded-md border border-ink/15 bg-surface px-3.5 py-2.5 text-left text-sm font-medium hoverable:hover:border-ink/50">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[88%] rounded-md px-3.5 py-2.5 text-sm", m.role === "user" ? "bg-ink text-board-text" : "border border-line bg-canvas")}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.proposals && m.proposals.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.proposals.map((p) => {
                    const done = m.applied?.includes(p.id);
                    return (
                      <div key={p.id} className="flex items-center gap-2 border-t border-line pt-2.5">
                        <Sparkles className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-sm font-medium">{p.label}</span>
                        {done ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-ink">
                            <Check className="h-4 w-4" /> Fatto
                          </span>
                        ) : (
                          <Button size="sm" variant="secondary" className="h-8" loading={applying === p.id} onClick={() => apply(i, [p])}>
                            Applica
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {m.proposals.length > 1 && m.proposals.some((p) => !m.applied?.includes(p.id)) && (
                    <Button size="sm" variant="primary" className="w-full" loading={applying === m.proposals.map((p) => p.id).join(",")} onClick={() => apply(i, m.proposals!.filter((p) => !m.applied?.includes(p.id)))}>
                      Applica tutto
                    </Button>
                  )}
                </div>
              )}
              {m.engine === "regole" && i === messages.length - 1 && <p className="mt-2 text-[11px] text-muted">Modalità demo (regole): aggiungi ANTHROPIC_API_KEY per l&apos;assistente AI completo.</p>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-1 px-2 py-3" aria-label="L'assistente sta scrivendo">
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-2 w-2 animate-pulse rounded-xs bg-ink/50" style={{ animationDelay: `${d * 120}ms` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </Sheet>
  );
}

export function AssistantButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn("press flex h-11 items-center gap-2 rounded-md bg-brand-500 px-4 text-sm font-bold text-ink shadow-[var(--shadow-float)] hoverable:hover:bg-brand-300", className)}>
      <Sparkles className="h-4 w-4" weight="fill" /> Assistente
    </button>
  );
}

