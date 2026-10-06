import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight" aria-label="TravelIo, home">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/40">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 17c4-1 6-5 9-10 1.5 3 3.5 5 9 6" />
          <circle cx="12" cy="7" r="1.2" fill="currentColor" />
        </svg>
      </span>
      <span>
        Travel<span className="text-brand-500">Io</span>
      </span>
    </Link>
  );
}
