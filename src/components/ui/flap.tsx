"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/format";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789€";

function normalize(text: string, length?: number) {
  const upper = text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (!length) return upper;
  return upper.length > length ? upper.slice(0, length - 1) + "." : upper.padEnd(length, " ");
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);
}

/**
 * Testo a palette, come i tabelloni Solari: ogni carattere sta nella sua cella.
 * Quando il testo cambia, le celle scorrono qualche lettera prima di fermarsi, da sinistra a destra.
 * Le celle sono decorative: chi usa uno screen reader legge il testo intero.
 */
export function FlapText({
  text,
  length,
  className,
  cellClassName,
  animateOnMount = false,
  delay = 0,
}: {
  text: string;
  /** Numero fisso di celle: il testo più lungo viene troncato, quello più corto riempito di celle vuote. */
  length?: number;
  className?: string;
  cellClassName?: string;
  animateOnMount?: boolean;
  /** Ritardo in ms prima che la cascata parta (per sfalsare le righe di un tabellone). */
  delay?: number;
}) {
  const target = normalize(text, length);
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(() => (animateOnMount ? target.replace(/\S/g, " ") : target));
  const [tick, setTick] = useState<number[]>(() => Array.from(target, () => 0));
  const frame = useRef<number | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if ((first && !animateOnMount) || reduced) return;
    // Ogni cella fa da 2 a 5 giri; le celle a destra partono un poco dopo
    const steps = Array.from(target, (ch, i) => (ch === " " ? 0 : 2 + ((i * 7 + target.length) % 4)));
    const start = performance.now() + delay;
    const STEP_MS = 55;
    const STAGGER_MS = 22;
    const run = (now: number) => {
      let done = true;
      const next = Array.from(target, (ch, i) => {
        const elapsed = now - start - i * STAGGER_MS;
        if (elapsed < 0) {
          done = false;
          return " ";
        }
        const step = Math.floor(elapsed / STEP_MS);
        if (step >= steps[i]) return ch;
        done = false;
        return CHARSET[(i * 11 + step * 5 + ch.charCodeAt(0)) % CHARSET.length];
      }).join("");
      setShown((prev) => {
        if (prev !== next) {
          setTick((t) => Array.from(next, (c, i) => (c !== prev[i] ? (t[i] ?? 0) + 1 : t[i] ?? 0)));
        }
        return next;
      });
      if (!done) frame.current = requestAnimationFrame(run);
    };
    frame.current = requestAnimationFrame(run);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // Si riparte solo quando cambia il testo di destinazione
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced]);

  // Con movimento ridotto il testo compare subito, senza cascata
  const display = reduced ? target : shown;
  const chars = Array.from(display.padEnd(target.length, " ").slice(0, target.length));
  return (
    <span className={cn("flap inline-flex flex-wrap gap-[0.08em] tracking-normal", className)}>
      <span className="sr-only">{text}</span>
      {words(target).map(([from, to]) => (
        <span key={from} className="inline-flex gap-[0.08em]" aria-hidden>
          {chars.slice(from, to).map((ch, j) => {
            const i = from + j;
            return (
              <span key={i} className={cn("flap-cell", cellClassName)} data-flip={tick[i] ? "" : undefined}>
                <span key={tick[i] ?? 0}>{ch === " " ? "\u00a0" : ch}</span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

/** Raggruppa le celle per parola (spazio finale compreso), così il tabellone va a capo solo tra le parole. */
function words(target: string): [number, number][] {
  const out: [number, number][] = [];
  let start = 0;
  for (let i = 0; i < target.length; i++) {
    if (target[i] === " " && (i + 1 === target.length || target[i + 1] !== " ")) {
      out.push([start, i + 1]);
      start = i + 1;
    }
  }
  if (start < target.length) out.push([start, target.length]);
  return out;
}

/** Versione statica per i componenti server: stesse celle, nessuna animazione. */
export function FlapStatic({ text, length, className, cellClassName }: { text: string; length?: number; className?: string; cellClassName?: string }) {
  const target = normalize(text, length);
  return (
    <span className={cn("flap inline-flex flex-wrap gap-[0.08em] tracking-normal", className)}>
      <span className="sr-only">{text}</span>
      {words(target).map(([from, to]) => (
        <span key={from} className="inline-flex gap-[0.08em]" aria-hidden>
          {Array.from(target.slice(from, to)).map((ch, j) => (
            <span key={j} className={cn("flap-cell", cellClassName)}>
              <span>{ch === " " ? "\u00a0" : ch}</span>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
