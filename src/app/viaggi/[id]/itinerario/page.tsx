import type { Metadata } from "next";
import { ItineraryBuilder } from "@/components/itinerary/itinerary-builder";
import { activities } from "@/server/providers";
import { loadTrip } from "@/server/load-trip";

export const metadata: Metadata = { title: "Itinerario" };

export default async function ItineraryPage({ params, searchParams }: PageProps<"/viaggi/[id]/itinerario">) {
  const { id } = await params;
  const { giorno } = await searchParams;
  const { trip } = await loadTrip(id);
  const pois = await activities.listForDestination(trip.destinationId);
  const dayIndex = Math.max(0, (Number(giorno) || 1) - 1);
  return (
    <ItineraryBuilder
      tripId={trip.id}
      initial={trip.itinerary}
      pois={pois}
      hotel={trip.stay ? { name: trip.stay.name, location: trip.stay.location } : null}
      center={trip.location}
      pace={trip.pace}
      initialDayIndex={dayIndex}
      hasFlights={trip.flights.length > 0}
      hasStay={!!trip.stay}
    />
  );
}
