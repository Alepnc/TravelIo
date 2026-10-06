"use client";

/**
 * Bozza di viaggio: ciò che l'utente seleziona durante la ricerca vive nel browser,
 * così può esplorare e confrontare senza account. Al salvataggio (dopo il login) la bozza
 * precompila il form e il server rilegge le offerte dal provider tramite il loro id.
 */
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { AccommodationOffer, FlightOffer } from "@/lib/types";

export interface DraftSearch {
  from?: string;
  to?: string;
  depart?: string;
  ret?: string;
  travelers: number;
  budget?: number;
}

export interface DraftTrip {
  search: DraftSearch;
  destinationName?: string;
  outbound?: FlightOffer;
  inbound?: FlightOffer;
  stay?: AccommodationOffer;
  /** Se impostato, le selezioni vanno direttamente a un viaggio salvato */
  tripId?: string;
}

interface DraftContextValue {
  draft: DraftTrip | null;
  setSearch: (search: DraftSearch, destinationName?: string) => void;
  select: (patch: Partial<Pick<DraftTrip, "outbound" | "inbound" | "stay">>) => void;
  clear: () => void;
}

const KEY = "travelio:draft";
const DraftContext = createContext<DraftContextValue | null>(null);

const CHANGE_EVENT = "travelio:draft-change";

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memoryFallback;
  }
}

let memoryFallback: string | null = null;

function read(): DraftTrip | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DraftTrip;
  } catch {
    return null;
  }
}

function persist(next: DraftTrip | null) {
  const raw = next ? JSON.stringify(next) : null;
  memoryFallback = raw;
  try {
    if (raw) window.localStorage.setItem(KEY, raw);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage non disponibile: la bozza resta in memoria */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function DraftProvider({ children }: { children: ReactNode }) {
  // Sul server (e durante l'idratazione) la bozza è null: niente mismatch
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const draft = useMemo<DraftTrip | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DraftTrip;
    } catch {
      return null;
    }
  }, [raw]);

  const value = useMemo<DraftContextValue>(
    () => ({
      draft,
      setSearch: (search, destinationName) => {
        const current = read();
        const sameTrip = current && current.search.to === search.to && current.search.depart === search.depart && current.search.ret === search.ret && current.search.from === search.from;
        if (sameTrip && JSON.stringify(current.search) === JSON.stringify(search) && (!destinationName || current.destinationName === destinationName)) return;
        persist(sameTrip ? { ...current, search, destinationName: destinationName ?? current.destinationName } : { search, destinationName });
      },
      select: (patch) => {
        const current = read() ?? { search: { travelers: 2 } };
        persist({ ...current, ...patch });
      },
      clear: () => persist(null),
    }),
    [draft],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft deve essere usato dentro DraftProvider");
  return ctx;
}

export function draftTotal(draft: DraftTrip | null): { perPerson: number; total: number; items: number } {
  if (!draft) return { perPerson: 0, total: 0, items: 0 };
  const travelers = draft.search.travelers || 1;
  const flights = (draft.outbound?.price ?? 0) + (draft.inbound?.price ?? 0);
  const total = flights * travelers + (draft.stay?.priceTotal ?? 0);
  const items = [draft.outbound, draft.inbound, draft.stay].filter(Boolean).length;
  return { perPerson: Math.round(total / travelers), total, items };
}
