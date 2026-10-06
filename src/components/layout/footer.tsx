import Link from "next/link";
import { usingMockData } from "@/server/providers";
import { Logo } from "./logo";

export function Footer() {
  const cols = [
    { title: "Scopri", links: [["Ispirazione", "/ispirazione"], ["Prezzi", "/prezzi"], ["Cerca un viaggio", "/cerca"]] },
    { title: "Organizza", links: [["I miei viaggi", "/viaggi"], ["Crea viaggio", "/viaggi/nuovo"], ["Profilo", "/profilo"]] },
  ];
  return (
    <footer className="mt-24 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">Dall&apos;idea all&apos;itinerario, in un unico posto. Pensato per chi viaggia con lo zaino e con il budget.</p>
          <p className="mt-4 text-xs text-muted">
            {usingMockData
              ? "Prezzi e disponibilità mostrati in questa versione sono dati dimostrativi."
              : "Prezzi di voli e alloggi rilevati da Google Flights e Google Hotels. Il prezzo finale e le condizioni sono quelli del sito del venditore, dove prenoti."}
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-3 text-sm font-semibold">{c.title}</p>
            <ul className="space-y-2 text-sm text-muted">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hoverable:hover:text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">© {new Date().getFullYear()} TravelIo</div>
    </footer>
  );
}
