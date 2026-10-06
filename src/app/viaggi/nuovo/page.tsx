import type { Metadata } from "next";
import { createTripAction } from "@/app/actions/trips";
import { DraftTripForm, TripForm } from "@/components/trips/trip-form";
import { Container } from "@/components/ui/misc";
import { requireUser } from "@/server/auth/session";
import { getSearchOptions } from "@/server/services/options";

export const metadata: Metadata = { title: "Crea viaggio" };

export default async function NewTripPage({ searchParams }: PageProps<"/viaggi/nuovo">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  await requireUser(`/viaggi/nuovo${str("bozza") ? "?bozza=1" : ""}`);
  const options = await getSearchOptions();
  const iso = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return (
    <Container className="max-w-2xl pb-24 pt-8 sm:pt-12">
      <h1 className="text-4xl font-extrabold">Crea il tuo viaggio</h1>
      <p className="mt-2 text-muted">Bastano destinazione e date: voli, alloggio e itinerario li aggiungi quando vuoi.</p>
      <div className="mt-8">
        {(() => {
          const props = {
            action: createTripAction,
            origins: options.origins,
            destinations: options.destinations,
            submitLabel: "+ Crea viaggio",
            initial: {
              destinationId: str("to"),
              startDate: iso(str("depart")),
              endDate: iso(str("ret")),
              travelersCount: Number(str("travelers")) || undefined,
              budgetPerPerson: Number(str("budget")) || undefined,
              originCode: str("from") ?? options.homeAirport,
            },
          };
          return str("bozza") === "1" ? <DraftTripForm {...props} /> : <TripForm {...props} />;
        })()}
      </div>
    </Container>
  );
}
