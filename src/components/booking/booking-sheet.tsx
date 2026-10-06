"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import type { BookingOption } from "@/lib/types";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/misc";
import { cn, formatPrice } from "@/lib/format";

export interface BookingRequest {
  url: string;
  body: unknown;
}

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; options: BookingOption[] };

function SellerButton({ option }: { option: BookingOption }) {
  const cls = buttonClass("secondary", "sm");
  const rel = "noopener noreferrer";
  if (option.method === "POST") {
    return (
      <form action={option.url} method="post" target="_blank" rel={rel}>
        {Object.entries(option.fields ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button type="submit" className={cls}>
          Vai al sito <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </form>
    );
  }
  return (
    <a href={option.url} target="_blank" rel={rel} className={cls}>
      Vai al sito <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function Options({ request }: { request: BookingRequest }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request.body) })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) setState({ status: "error", message: data.error ?? "Non riusciamo a caricare i venditori." });
        else setState({ status: "ok", options: data.options ?? [] });
      })
      .catch(() => alive && setState({ status: "error", message: "Connessione assente o servizio non raggiungibile." }));
    return () => {
      alive = false;
    };
  }, [request]);

  if (state.status === "loading")
    return (
      <div className="space-y-2.5" aria-busy="true" aria-label="Carico i venditori">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  if (state.status === "error")
    return (
      <p role="alert" className="rounded-2xl bg-danger/5 p-4 text-sm text-danger">
        {state.message}
      </p>
    );
  if (state.options.length === 0)
    return <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">Nessun venditore disponibile per questa offerta. Ripeti la ricerca: i prezzi cambiano di continuo.</p>;

  const cheapest = Math.min(...state.options.map((o) => o.price ?? Infinity));
  return (
    <ul className="space-y-2.5">
      {state.options.map((o, i) => (
        <li key={`${o.seller}-${i}`} className={cn("flex items-center gap-3 rounded-2xl border p-3.5", o.price === cheapest ? "border-success/40 bg-success/5" : "border-line")}>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{o.seller}</p>
            {o.note && <p className="line-clamp-2 text-xs text-muted">{o.note}</p>}
            {o.price === cheapest && <p className="mt-0.5 text-xs font-bold text-success">Prezzo più basso</p>}
          </div>
          <p className="shrink-0 text-right font-display text-xl font-extrabold tabular-nums">{o.price != null ? formatPrice(o.price) : "—"}</p>
          <SellerButton option={o} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Elenco dei venditori (compagnia aerea, agenzie online, hotel) verso cui si viene rimandati per prenotare.
 * I link arrivano dal server; qui si apre sempre il sito del venditore in una nuova scheda.
 */
export function BookingSheet({ open, onClose, title, request }: { open: boolean; onClose: () => void; title: string; request: BookingRequest | null }) {
  return (
    <Sheet open={open && !!request} onClose={onClose} title={title}>
      <p className="mb-4 flex items-start gap-2 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <span>Prenoti direttamente sul sito del venditore. Lì trovi prezzo finale, bagagli e condizioni, che possono differire da quelli mostrati qui.</span>
      </p>
      {request && <Options key={JSON.stringify(request)} request={request} />}
    </Sheet>
  );
}
