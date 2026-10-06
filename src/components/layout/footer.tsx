import Link from "next/link";
import { usingMockData } from "@/server/providers";
import { Logo } from "./logo";

export function Footer() {
  const cols = [
    { title: "Scopri", links: [["Ispirazione", "/ispirazione"], ["Prezzi", "/prezzi"], ["Cerca un viaggio", "/cerca"]] },
    { title: "Organizza", links: [["I miei viaggi", "/viaggi"], ["Crea viaggio", "/viaggi/nuovo"], ["Profilo", "/profilo"]] },
  ];
  return (
    <footer className="mt-24 bg-board pb-24 text-board-text md:pb-0">
      <div className="mx-auto grid max-w-[76rem] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-board-dim">Dall&apos;idea all&apos;itinerario, in un unico posto. Pensato per chi viaggia con lo zaino e con il budget.</p>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-board-dim">
            {usingMockData
              ? "Prezzi e disponibilità mostrati in questa versione sono dati dimostrativi."
              : "Prezzi di voli e alloggi rilevati da Google Flights e Google Hotels. Il prezzo finale e le condizioni sono quelli del sito del venditore, dove prenoti."}
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="col-label mb-3 text-board-dim">{c.title}</p>
            <ul className="space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-board-text underline-offset-4 hoverable:hover:text-brand-500 hoverable:hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[76rem] border-t border-board-frame px-4 py-5 text-xs text-board-dim sm:px-6">© {new Date().getFullYear()} TravelIo</div>
    </footer>
  );
}
