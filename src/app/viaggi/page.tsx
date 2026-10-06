import type { Metadata } from "next";
import Link from "next/link";
import { MapTrifold as Map, Plus } from "@phosphor-icons/react/dist/ssr";
import { TripRow } from "@/components/trips/trip-card";
import { PlanWithAssistant } from "@/components/assistant/global-assistant";
import { LinkButton } from "@/components/ui/button";
import { Container, EmptyState } from "@/components/ui/misc";
import { STATUS_META } from "@/lib/dto";
import type { TripStatus } from "@/lib/types";
import { cn } from "@/lib/format";
import { getCurrentUser } from "@/server/auth/session";
import { listTrips } from "@/server/services/trips";

export const metadata: Metadata = { title: "I miei viaggi" };

const FILTERS: (TripStatus | "tutti")[] = ["tutti", "pianificazione", "confermato", "in_corso", "completato"];

export default async function TripsPage({ searchParams }: PageProps<"/viaggi">) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Container className="max-w-2xl py-16">
        <EmptyState
          icon={<Map className="h-5 w-5" />}
          title="I tuoi viaggi, sempre a portata di mano"
          description="Puoi cercare e confrontare senza account. Per salvare un viaggio, generare l'itinerario e ritrovarlo da qualsiasi dispositivo, accedi."
          action={
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/accedi?next=/viaggi">Accedi</LinkButton>
              <LinkButton href="/registrati?next=/viaggi" variant="outline">
                Crea un account
              </LinkButton>
            </div>
          }
        />
      </Container>
    );
  }

  const { stato } = await searchParams;
  const filter = FILTERS.includes(stato as TripStatus) ? (stato as TripStatus) : "tutti";
  const all = await listTrips(user.id);
  const trips = filter === "tutti" ? all : all.filter((t) => t.status === filter);

  return (
    <Container className="pb-24 pt-10 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.5rem] font-bold leading-none [font-stretch:75%] sm:text-6xl">I miei viaggi</h1>
          <p className="mt-3 text-muted">Ciao {user.name.split(" ")[0]}, ecco il tuo tabellone: ogni viaggio è una partenza.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlanWithAssistant />
          <LinkButton href="/viaggi/nuovo" variant="secondary" icon={<Plus className="h-4 w-4" />}>
            Crea viaggio
          </LinkButton>
        </div>
      </div>

      {all.length > 0 && (
        <div className="scrollbar-none -mx-4 mt-8 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => {
            const count = f === "tutti" ? all.length : all.filter((t) => t.status === f).length;
            return (
              <Link key={f} href={f === "tutti" ? "/viaggi" : `/viaggi?stato=${f}`} scroll={false} className={cn("flex h-10 shrink-0 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold transition-colors duration-150", filter === f ? "border-ink bg-ink text-board-text" : "border-ink/15 bg-surface hoverable:hover:border-ink/50")}>
                {f === "tutti" ? "Tutti" : STATUS_META[f].label} <span className="tabular text-xs opacity-70">{count}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        {all.length === 0 ? (
          <EmptyState
            icon={<Map className="h-5 w-5" />}
            title="Nessun viaggio, per ora"
            description="Crea il tuo primo viaggio o cerca ispirazione: in pochi minuti avrai voli, alloggio e itinerario in un unico posto."
            action={
              <div className="flex flex-wrap gap-2">
                <LinkButton href="/viaggi/nuovo" variant="secondary" icon={<Plus className="h-4 w-4" />}>
                  Crea viaggio
                </LinkButton>
                <LinkButton href="/ispirazione" variant="outline">
                  Trova ispirazione
                </LinkButton>
              </div>
            }
          />
        ) : trips.length === 0 ? (
          <p className="border-y border-line py-8 text-muted">Nessun viaggio in questo stato.</p>
        ) : (
          <div className="board-panel px-3 py-3 text-board-text sm:px-5 sm:py-4">
            <div className="col-label hidden grid-cols-[4.5rem_5.5rem_minmax(0,1.6fr)_minmax(0,1fr)_9.5rem_2.5rem] gap-x-5 border-b border-board-frame pb-2 text-board-dim sm:grid" aria-hidden>
              <span />
              <span>Partenza</span>
              <span>Destinazione</span>
              <span>Chi e quanto</span>
              <span>Stato</span>
              <span />
            </div>
            <ol>
              {trips.map((t) => (
                <TripRow key={t.id} trip={t} />
              ))}
            </ol>
          </div>
        )}
      </div>
    </Container>
  );
}
