import Link from "next/link";
import { CalendarDays, ChevronLeft, Pencil, Users } from "lucide-react";
import { CoverImage } from "@/components/ui/cover-image";
import { Container } from "@/components/ui/misc";
import { StatusSelect } from "@/components/trips/status-select";
import { TripTabs } from "@/components/trips/trip-tabs";
import { flagEmoji, pluralize } from "@/lib/format";
import { diffDays, formatDateRange } from "@/lib/time";
import { loadTrip } from "@/server/load-trip";

export default async function TripLayout({ children, params }: LayoutProps<"/viaggi/[id]">) {
  const { id } = await params;
  const { trip } = await loadTrip(id);
  const nights = diffDays(trip.startDate, trip.endDate);
  return (
    <div>
      <div className="relative">
        <CoverImage src={trip.imageUrl} alt={trip.destinationName} sizes="100vw" priority className="h-40 w-full sm:h-52" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
        <Container className="absolute inset-x-0 top-0 pt-4">
          <Link href="/viaggi" className="inline-flex items-center gap-1 rounded-full bg-black/30 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">
            <ChevronLeft className="h-4 w-4" /> I miei viaggi
          </Link>
        </Container>
        <Container className="absolute inset-x-0 bottom-0 pb-4 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-extrabold sm:text-4xl">
                {flagEmoji(trip.countryCode)} {trip.name}
              </h1>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-white/90">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" /> {formatDateRange(trip.startDate, trip.endDate)} · {pluralize(nights, "notte", "notti")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {pluralize(trip.travelersCount, "viaggiatore", "viaggiatori")}
                </span>
              </p>
            </div>
            <Link href={`/viaggi/${trip.id}/modifica`} className="press flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3 text-sm font-semibold backdrop-blur hoverable:hover:bg-white/30">
              <Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Modifica</span>
            </Link>
          </div>
        </Container>
      </div>
      <div className="sticky top-16 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <Container className="flex items-center justify-between gap-3">
          <TripTabs tripId={trip.id} />
          <StatusSelect tripId={trip.id} status={trip.status} />
        </Container>
      </div>
      {children}
    </div>
  );
}
