import Link from "next/link";
import { CalendarDots as CalendarDays, CaretLeft as ChevronLeft, MapPin, PencilSimple as Pencil, Users } from "@phosphor-icons/react/dist/ssr";
import { CoverImage } from "@/components/ui/cover-image";
import { Container } from "@/components/ui/misc";
import { StatusSelect } from "@/components/trips/status-select";
import { TripTabs } from "@/components/trips/trip-tabs";
import { pluralize } from "@/lib/format";
import { diffDays, formatDateRange } from "@/lib/time";
import { loadTrip } from "@/server/load-trip";

export default async function TripLayout({ children, params }: LayoutProps<"/viaggi/[id]">) {
  const { id } = await params;
  const { trip } = await loadTrip(id);
  const nights = diffDays(trip.startDate, trip.endDate);
  return (
    <div>
      <div className="bg-board text-board-text">
        <Container className="flex items-end justify-between gap-6 pb-6 pt-4 sm:pb-8">
          <div className="min-w-0">
            <Link href="/viaggi" className="-ml-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 text-sm text-board-dim underline-offset-4 hoverable:hover:text-board-text hoverable:hover:underline">
              <ChevronLeft className="h-3.5 w-3.5" weight="bold" /> I miei viaggi
            </Link>
            <h1 className="mt-3 text-3xl font-bold leading-[1.05] [font-stretch:78%] sm:text-[2.75rem]">{trip.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-board-dim">
              <span className="flex items-center gap-1.5 text-board-text">
                <MapPin className="h-4 w-4 text-brand-500" weight="fill" /> {trip.destinationName}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {formatDateRange(trip.startDate, trip.endDate)} · {pluralize(nights, "notte", "notti")}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {pluralize(trip.travelersCount, "viaggiatore", "viaggiatori")}
              </span>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusSelect tripId={trip.id} status={trip.status} />
              <Link href={`/viaggi/${trip.id}/modifica`} className="press flex h-9 items-center gap-1.5 rounded-sm border border-board-frame px-3 text-sm font-semibold hoverable:hover:border-board-dim">
                <Pencil className="h-4 w-4" /> Modifica
              </Link>
            </div>
          </div>
          <CoverImage src={trip.imageUrl} alt={trip.destinationName} label={trip.destinationName} sizes="320px" priority className="hidden aspect-[4/3] w-56 shrink-0 rounded-md md:block lg:w-72" />
        </Container>
      </div>
      <div className="sticky top-14 z-30 border-b border-ink/15 bg-canvas">
        <Container className="flex items-center justify-between gap-3">
          <TripTabs tripId={trip.id} />
        </Container>
      </div>
      {children}
    </div>
  );
}
