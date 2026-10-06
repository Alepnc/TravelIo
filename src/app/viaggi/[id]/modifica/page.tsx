import { updateTripAction } from "@/app/actions/trips";
import { TripForm } from "@/components/trips/trip-form";
import { Container } from "@/components/ui/misc";
import { loadTrip } from "@/server/load-trip";
import { getSearchOptions } from "@/server/services/options";

export default async function EditTripPage({ params }: PageProps<"/viaggi/[id]/modifica">) {
  const { id } = await params;
  const [{ trip }, options] = await Promise.all([loadTrip(id), getSearchOptions()]);
  return (
    <Container className="max-w-2xl pb-24 pt-8">
      <h2 className="text-2xl font-bold">Modifica viaggio</h2>
      <p className="mt-1 text-sm text-muted">
        Cambiando le date l&apos;itinerario mantiene le giornate esistenti e aggiunge o rimuove quelle in eccesso. Cambiando destinazione voli, alloggio e itinerario vengono azzerati.
      </p>
      <div className="mt-6">
        <TripForm
          action={updateTripAction.bind(null, trip.id)}
          origins={options.origins}
          destinations={options.destinations}
          initial={{ ...trip, originCode: trip.originCode ?? "" }}
          submitLabel="Salva modifiche"
        />
      </div>
    </Container>
  );
}
