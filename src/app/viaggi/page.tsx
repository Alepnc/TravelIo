import type { Metadata } from "next";
import Link from "next/link";
import { Map, Plus } from "lucide-react";
import { TripCard } from "@/components/trips/trip-card";
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
          icon={<Map className="h-6 w-6" />}
          title="I tuoi viaggi, sempre a portata di mano"
          description="Puoi cercare e confrontare senza account. Per salvare un viaggio, generare l'itinerario e ritrovarlo da qualsiasi dispositivo, accedi."
          action={
            <div className="flex flex-wrap justify-center gap-2">
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
  const all = listTrips(user.id);
  const trips = filter === "tutti" ? all : all.filter((t) => t.status === filter);

  return (
    <Container className="pb-24 pt-8 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">Ciao {user.name.split(" ")[0]}</p>
          <h1 className="text-4xl font-extrabold">I miei viaggi</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlanWithAssistant />
          <LinkButton href="/viaggi/nuovo" variant="secondary" icon={<Plus className="h-4 w-4" />}>
            Crea viaggio
          </LinkButton>
        </div>
      </div>

      {all.length > 0 && (
        <div className="scrollbar-none -mx-4 mt-6 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => {
            const count = f === "tutti" ? all.length : all.filter((t) => t.status === f).length;
            return (
              <Link key={f} href={f === "tutti" ? "/viaggi" : `/viaggi?stato=${f}`} scroll={false} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold", filter === f ? "bg-ink text-white" : "text-muted hoverable:hover:bg-ink/5")}>
                {f === "tutti" ? "Tutti" : STATUS_META[f].label} <span className="opacity-60">{count}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        {all.length === 0 ? (
          <EmptyState
            icon={<Map className="h-6 w-6" />}
            title="Nessun viaggio, per ora"
            description="Crea il tuo primo viaggio o cerca ispirazione: in pochi minuti avrai voli, alloggio e itinerario in un unico posto."
            action={
              <div className="flex flex-wrap justify-center gap-2">
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
          <p className="py-10 text-center text-muted">Nessun viaggio in questo stato.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
