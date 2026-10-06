"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Pannello modale: bottom sheet su mobile, pannello laterale su desktop.
 * Chiusura con Esc, click sullo sfondo; focus iniziale nel pannello e blocco dello scroll.
 */
export function Sheet({ open, onClose, title, children, footer, side = "right", className }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; side?: "right" | "bottom"; className?: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="absolute inset-0 bg-ink/40 transition-opacity duration-200 starting:opacity-0" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col bg-surface shadow-[var(--shadow-float)] outline-none transition-transform duration-300 ease-[var(--ease-drawer)]",
          "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[1.75rem] starting:translate-y-full",
          side === "right" ? "md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none md:rounded-l-[1.75rem] md:starting:translate-x-full md:starting:translate-y-0" : "md:mx-auto md:max-w-xl",
          className,
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button onClick={onClose} className="press flex h-9 w-9 items-center justify-center rounded-full hoverable:hover:bg-ink/5" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="pb-safe border-t border-line px-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}
